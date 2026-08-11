package service

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/CoderLucien/beerfest-api/internal/model"
)

const jwtSecret = "beerfest-2026-demo-secret-key"

type AuthService struct {
	db    *sql.DB
	redis *redis.Client
}

func NewAuthService(db *sql.DB, rdb *redis.Client) *AuthService {
	return &AuthService{db: db, redis: rdb}
}

func (s *AuthService) SendCode(phone, ip, userAgent string) error {
	if len(phone) != 11 {
		return fmt.Errorf("invalid phone number")
	}

	// Rate limit: one code per 60s per phone
	rateKey := fmt.Sprintf("sms:rate:%s", phone)
	exists, err := s.redis.Exists(context.Background(), rateKey).Result()
	if err != nil {
		return fmt.Errorf("rate check: %w", err)
	}
	if exists > 0 {
		return fmt.Errorf("code already sent, please wait 60s")
	}

	code, _ := rand.Int(rand.Reader, big.NewInt(900000))
	codeStr := fmt.Sprintf("%06d", code.Int64()+100000)

	key := fmt.Sprintf("sms:code:%s", phone)
	if err := s.redis.Set(context.Background(), key, codeStr, 5*time.Minute).Err(); err != nil {
		return fmt.Errorf("store code: %w", err)
	}

	// Log code for demo (no real SMS gateway)
	log.Printf("[mock-sms] to=%s code=%s", phone, codeStr)

	// Rate limit window + audit log
	s.redis.Set(context.Background(), rateKey, codeStr, 60*time.Second)
	s.redis.Set(context.Background(), fmt.Sprintf("sms:log:%s:%d", phone, time.Now().Unix()), ip+"|"+userAgent, 24*time.Hour)

	return nil
}

func (s *AuthService) Login(phone, code, ip, userAgent string) (string, *model.User, error) {
	key := fmt.Sprintf("sms:code:%s", phone)
	stored, err := s.redis.Get(context.Background(), key).Result()
	if err == redis.Nil {
		return "", nil, fmt.Errorf("code expired or not sent")
	}
	if err != nil {
		return "", nil, fmt.Errorf("verify code: %w", err)
	}
	if stored != code {
		return "", nil, fmt.Errorf("invalid code")
	}
	s.redis.Del(context.Background(), key)

	user, err := s.findOrCreate(phone)
	if err != nil {
		return "", nil, fmt.Errorf("find or create user: %w", err)
	}

	// Audit: log login IP/UA
	s.redis.Set(context.Background(), fmt.Sprintf("login:log:%s:%d", user.ID, time.Now().Unix()), ip+"|"+userAgent, 30*24*time.Hour)

	token, err := s.issueToken(user.ID, phone)
	if err != nil {
		return "", nil, fmt.Errorf("issue token: %w", err)
	}
	return token, user, nil
}

func (s *AuthService) findOrCreate(phone string) (*model.User, error) {
	u := &model.User{}
	err := s.db.QueryRow(`SELECT id, phone, created_at FROM users WHERE phone=?`, phone).
		Scan(&u.ID, &u.Phone, &u.CreatedAt)
	if err == nil {
		return u, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	u = &model.User{
		ID:        uuid.New().String(),
		Phone:     phone,
		CreatedAt: time.Now(),
	}
	_, err = s.db.Exec(`INSERT INTO users (id, phone, created_at) VALUES (?, ?, ?)`,
		u.ID, u.Phone, u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *AuthService) issueToken(userID, phone string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"phone":   phone,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

func (s *AuthService) issueAdminToken(userID, username, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"role":     role,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

func (s *AuthService) DemoLogin() (string, *model.User, error) {
	const demoPhone = "13800000000"
	user, err := s.findOrCreate(demoPhone)
	if err != nil {
		return "", nil, fmt.Errorf("demo user: %w", err)
	}
	token, err := s.issueToken(user.ID, demoPhone)
	if err != nil {
		return "", nil, fmt.Errorf("issue token: %w", err)
	}
	log.Printf("[demo-login] user=%s phone=%s", user.ID, demoPhone)
	return token, user, nil
}

func (s *AuthService) AdminLogin(username, password, ip, userAgent string) (string, *model.User, error) {
	// Lockout check: 5 failures → 5min lock
	lockKey := fmt.Sprintf("admin:lock:%s", username)
	locked, _ := s.redis.Exists(context.Background(), lockKey).Result()
	if locked > 0 {
		return "", nil, fmt.Errorf("account locked, please try again in 5 minutes")
	}

	var u model.User
	err := s.db.QueryRow(
		`SELECT id, phone, COALESCE(username,''), COALESCE(password_hash,''), COALESCE(role,'user'), created_at
		 FROM users WHERE username=? AND role='admin'`, username,
	).Scan(&u.ID, &u.Phone, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if err != nil {
		return "", nil, fmt.Errorf("invalid username or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		// Track failures
		failKey := fmt.Sprintf("admin:fail:%s", username)
		s.redis.Incr(context.Background(), failKey)
		s.redis.Expire(context.Background(), failKey, 5*time.Minute)
		count, _ := s.redis.Get(context.Background(), failKey).Int()
		if count >= 5 {
			s.redis.Set(context.Background(), lockKey, "locked", 5*time.Minute)
			log.Printf("[admin-login] account %s locked after 5 failures", username)
			return "", nil, fmt.Errorf("account locked, please try again in 5 minutes")
		}
		log.Printf("[admin-login] failed attempt %d for %s from %s", count, username, ip)
		return "", nil, fmt.Errorf("invalid username or password")
	}

	// Success: clear failure count, write audit log
	s.redis.Del(context.Background(), fmt.Sprintf("admin:fail:%s", username))
	s.redis.Set(context.Background(),
		fmt.Sprintf("login:log:admin:%s:%d", username, time.Now().Unix()),
		ip+"|"+userAgent, 30*24*time.Hour,
	)
	log.Printf("[admin-login] success: %s from %s", username, ip)

	token, err := s.issueAdminToken(u.ID, u.Username, u.Role)
	if err != nil {
		return "", nil, fmt.Errorf("issue token: %w", err)
	}
	return token, &u, nil
}

// ValidateTokenWithGrace validates a JWT and returns user_id. Unlike ValidateToken,
// it accepts tokens whose exp is within gracePeriod past expiry, making it suitable
// for token refresh endpoints where we want to re-issue an expired token.
func ValidateTokenWithGrace(tokenStr string, gracePeriod time.Duration) (string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(jwtSecret), nil
	}, jwt.WithLeeway(gracePeriod))
	if err != nil {
		return "", err
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("invalid token")
	}
	userID, _ := claims["user_id"].(string)
	return userID, nil
}

func (s *AuthService) RefreshAdminToken(tokenStr string) (string, error) {
	// Accept tokens up to 2 hours past expiry
	userID, err := ValidateTokenWithGrace(tokenStr, 2*time.Hour)
	if err != nil {
		return "", err
	}

	// Verify the user is still an admin
	var username, role string
	err = s.db.QueryRow(`SELECT COALESCE(username,''), COALESCE(role,'user') FROM users WHERE id=? AND role='admin'`, userID).
		Scan(&username, &role)
	if err != nil {
		return "", fmt.Errorf("admin user not found or deactivated")
	}

	return s.issueAdminToken(userID, username, role)
}

func ValidateToken(tokenStr string) (string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})
	if err != nil {
		return "", err
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("invalid token")
	}
	userID, _ := claims["user_id"].(string)
	return userID, nil
}

func ValidateTokenWithRole(tokenStr string) (string, string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})
	if err != nil {
		return "", "", err
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", "", fmt.Errorf("invalid token")
	}
	userID, _ := claims["user_id"].(string)
	role, _ := claims["role"].(string)
	return userID, role, nil
}
