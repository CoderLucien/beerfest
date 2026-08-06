package adapter

import (
	"fmt"
	"log"
	"math/rand"
	"time"
)

type PaymentResult struct {
	Success   bool   `json:"success"`
	PaymentID string `json:"payment_id"`
	TraceID   string `json:"trace_id"`
}

type SMSResult struct {
	Sent    bool   `json:"sent"`
	Message string `json:"message"`
}

func MockPayment(orderID string, amount float64) PaymentResult {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	success := rng.Float64() > 0.05
	log.Printf("[mock-payment] order=%s amount=%.2f success=%v", orderID, amount, success)
	return PaymentResult{
		Success:   success,
		PaymentID: fmt.Sprintf("PAY-%d", time.Now().UnixNano()),
		TraceID:   fmt.Sprintf("TRC-%d", time.Now().UnixNano()),
	}
}

func MockSMS(phone, content string) SMSResult {
	log.Printf("[mock-sms] to=%s content=%s", phone, content)
	return SMSResult{Sent: true, Message: "ok"}
}

func MockPOS(storeID, couponCode string) bool {
	log.Printf("[mock-pos] store=%s coupon=%s verified=true", storeID, couponCode)
	return true
}
