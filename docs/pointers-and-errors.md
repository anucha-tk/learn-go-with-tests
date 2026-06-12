---
title: "Pointers & Errors — ชี้จุดและจัดการความผิดพลาด"
slug: pointers-and-errors
order: 2
prereq: [arrays-n-slices]
tags: [fundamental, pointers, errors]
summary: "เข้าใจ Pointer (ตัวชี้ตำแหน่งหน่วยความจำ) เพื่อแก้ไขข้อมูลในฟังก์ชัน และเรียนรู้วิธีการจัดการ Error ในแบบฉบับของ Go"
updated: 2026-06-12
---

# Pointers & Errors — ชี้จุดและจัดการความผิดพลาด

> เมื่อเริ่มเขียนโปรแกรมที่ซับซ้อนขึ้น เรามักจะต้องประกาศฟังก์ชันหรือเมธอดที่สามารถเปลี่ยนค่าข้อมูลของออบเจกต์ (State) ได้ แต่ทำไมเขียนโค้ดตามปกติแล้วค่าถึงไม่เปลี่ยน? คำตอบอยู่ในเรื่องของ Pointer และการส่งคืนค่าความผิดพลาด (Errors)

## เรื่องของเรา

เรากำลังจะสร้างระบบ Wallet (กระเป๋าเงินจำลอง) ที่ผู้ใช้งานสามารถฝากเงิน (Deposit) ถอนเงิน (Withdraw) และตรวจสอบยอดคงเหลือ (Balance) ได้

ในบทนี้เราจะมาเรียนรู้และไขคำตอบผ่าน TDD ว่า:
- ทำไมเรียกเมธอด `Deposit` แล้วยอดเงินคงเหลือในกระเป๋าไม่เพิ่มขึ้น?
- Pointer (`*` และ `&`) เข้ามาช่วยแก้ปัญหานี้อย่างไร?
- วิธีการสร้างและจัดการความผิดพลาด (Errors) แบบ Idiomatic ใน Go เป็นอย่างไร?

## ปัญหาแรกที่เจอ — ค่าไม่ยอมเปลี่ยนเพราะ Go ส่งผ่านข้อมูลด้วยการก๊อปปี้

เมื่อเราเริ่มเขียนเทสต์แรกเพื่อฝากเงิน และสร้าง struct `Wallet` ขึ้นมาใช้งาน:

```go
type Wallet struct {
	balance int
}

func (w Wallet) Deposit(amount int) {
	w.balance += amount
}

func (w Wallet) Balance() int {
	return w.balance
}
```

พอยิงเทสต์รัน:
```
got 0 want 10
```

ทำไมถึงเป็นแบบนั้น? ทั้งที่ใน `Deposit` เราก็เขียน `w.balance += amount` ไปแล้ว?
ความจริงคือ **ในภาษา Go ทุกครั้งที่เราเรียกใช้ฟังก์ชันหรือเมธอด อาร์กิวเมนต์ที่ส่งเข้าไปจะถูกก๊อปปี้ (Pass by Value) เสมอ**
ตัวแปร `w` ที่อยู่ใน `Deposit(w Wallet)` คือ "ตัวก๊อปปี้" ของ Wallet ในฟังก์ชันเทสต์ ไม่ใช่ตัวจริง ดังนั้นเมื่อเราแก้ไขยอดเงินใน `w` ตัวจริงในเทสต์เลยไม่ได้รับการเปลี่ยนแปลงใด ๆ เลย

เราพิสูจน์สิ่งนี้ได้ด้วยการพิมพ์ที่อยู่หน่วยความจำ (Memory Address) โดยใช้ `%p`:

```go
fmt.Printf("address of balance in test is %p \n", &wallet.balance)
// ผลลัพธ์: 0xc420012260

fmt.Printf("address of balance in Deposit is %p \n", &w.balance)
// ผลลัพธ์: 0xc420012268
```
เห็นได้ชัดว่าที่อยู่ของข้อมูลต่างกัน แสดงว่าเป็นข้อมูลคนละกล่องกัน!

## ก่อนแก้ — แบบ naive (ไม่มีการใช้ Pointer)

นี่คือโค้ดแบบ Naive ที่พยายามแก้ไขข้อมูลโดยตรงโดยไม่มี Pointer ทำให้เทสต์ไม่มีทางผ่าน

```go
// wallet.go
type Wallet struct {
	balance int
}

func (w Wallet) Deposit(amount int) {
	w.balance += amount // แก้ไขที่ตัวสำเนา (Copy) เท่านั้น
}

func (w Wallet) Balance() int {
	return w.balance
}
```

## หลังแก้ — แบบ idiomatic (ใช้ Pointer)

เราแก้เรื่องนี้ได้ด้วยการเปลี่ยน Receiver ให้เป็น **Pointer** (ระบุด้วยสัญลักษณ์ `*` หน้าประเภทข้อมูล) เพื่อบอก Go ว่า "ไม่ต้องก๊อปปี้ Wallet ใหม่นะ ส่งตำแหน่งที่อยู่หน่วยความจำของตัวจริงมาเลย"

```go
// wallet.go
package pointers

import (
	"errors"
	"fmt"
)

type Bitcoin int

// Stringer interface จากแพ็กเกจ fmt
func (b Bitcoin) String() string {
	return fmt.Sprintf("%d BTC", b)
}

type Wallet struct {
	balance Bitcoin
}

// ใช้ *Wallet เป็น Receiver เพื่อรับ pointer ของ Wallet ตัวจริง
func (w *Wallet) Deposit(amount Bitcoin) {
	w.balance += amount
}

func (w *Wallet) Balance() Bitcoin {
	return w.balance
}

// กำหนด Sentinel Error เป็นค่าคงที่ของแพ็กเกจ
var ErrInsufficientFunds = errors.New("cannot withdraw, insufficient funds")

func (w *Wallet) Withdraw(amount Bitcoin) error {
	if amount > w.balance {
		return ErrInsufficientFunds
	}
	w.balance -= amount
	return nil
}
```

```go
// wallet_test.go
package pointers

import (
	"testing"
)

func TestWallet(t *testing.T) {

	t.Run("deposit", func(t *testing.T) {
		wallet := Wallet{}
		wallet.Deposit(Bitcoin(10))
		assertBalance(t, wallet, Bitcoin(10))
	})

	t.Run("withdraw with funds", func(t *testing.T) {
		wallet := Wallet{balance: Bitcoin(20)}
		err := wallet.Withdraw(Bitcoin(10))

		assertNoError(t, err)
		assertBalance(t, wallet, Bitcoin(10))
	})

	t.Run("withdraw insufficient funds", func(t *testing.T) {
		wallet := Wallet{balance: Bitcoin(20)}
		err := wallet.Withdraw(Bitcoin(100))

		assertError(t, err, ErrInsufficientFunds)
		assertBalance(t, wallet, Bitcoin(20))
	})
}

func assertBalance(t testing.TB, wallet Wallet, want Bitcoin) {
	t.Helper()
	got := wallet.Balance()

	if got != want {
		t.Errorf("got %s want %s", got, want)
	}
}

func assertNoError(t testing.TB, got error) {
	t.Helper()
	if got != nil {
		t.Fatal("got an error but didn't want one")
	}
}

func assertError(t testing.TB, got error, want error) {
	t.Helper()
	if got == nil {
		t.Fatal("didn't get an error but wanted one")
	}

	if got != want {
		t.Errorf("got %s, want %s", got, want)
	}
}
```

สิ่งที่เปลี่ยนไปและถือเป็นแบบแผนที่ถูกต้อง (Idiomatic Go):
1. **Pointer Receiver (`*Wallet`):** ทำให้เรียกใช้เมธอดและแก้ไขข้อมูลของตัวจริงได้ ยอดเงินเพิ่ม/ลดได้ถูกต้อง
2. **Automatic Dereferencing:** Go ออกแบบมาให้เราเขียน `w.balance` ได้ทันที โดยที่ Go จะทำการแปลงพอยน์เตอร์ให้อัตโนมัติ (ไม่ต้องเขียนยากๆ เป็น `(*w).balance`)
3. **การสร้างประเภทข้อมูลใหม่ (`Bitcoin`):** ประกาศ `type Bitcoin int` ทำให้เราสร้างเมธอด `String()` ให้แสดงผลเป็นหน่วย `BTC` ได้ผ่านอินเตอร์เฟส `Stringer` ของระบบจัดรูปแบบข้อความ
4. **การจัดการข้อผิดพลาด (Errors):** ใน Go เราใช้วิธีส่งคืนตัวแปรประเภท `error` หากเกิดความผิดพลาด และส่ง `nil` หากปกติ
5. **Sentinel Errors (`ErrInsufficientFunds`):** การกำหนดตัวแปร Error ไว้ที่ระดับแพ็กเกจทำให้ผู้ใช้ภายนอกและโค้ดเทสต์สามารถเปรียบเทียบค่าความผิดพลาดได้ง่าย (เช่น `err == ErrInsufficientFunds`) แทนที่จะต้องมาเทียบข้อความแบบ String ซึ่งมีโอกาสพังได้ง่าย

## ทำไมต้องรู้เรื่องนี้

- **Go ใช้การก๊อปปี้เป็นหลัก (Pass by Value):** ถ้าเราต้องการสร้างฟังก์ชันหรือเมธอดที่แก้ไขตัวแปรข้างนอกได้ เราจำเป็นต้องส่ง Pointer (`&myVar`) เสมอ
- **หลีกเลี่ยงการก๊อปปี้โครงสร้างข้อมูลขนาดใหญ่ (Performance):** การส่ง Pointer ไปทำให้อ่านข้อมูลจากตำแหน่งเดิมได้ทันที ไม่ต้องเสียทรัพยากรก๊อปปี้ข้อมูลขนาดใหญ่ใหม่
- **ความสอดคล้อง (Consistency):** หากเมธอดใดเมธอดหนึ่งใน Struct ต้องใช้ Pointer receiver แล้ว เมธอดอื่นใน Struct เดียวกันก็ควรใช้ Pointer receiver ด้วยแม้ไม่ได้แก้ไขค่าก็ตาม
- **การเขียนโค้ดที่ทนทาน (Robustness):** ใน Go หากเราละเลยไม่ตรวจสอบ Error ที่ส่งคืนมาจากฟังก์ชัน (Unchecked Errors) อาจก่อให้เกิดบั๊กที่ตามหายาก การรัน linter เช่น `errcheck` จะช่วยตรวจจับจุดที่เราลืมตรวจสอบได้

## หลุมที่เจอบ่อย

| อาการ | สาเหตุ | วิธีแก้ |
| --- | --- | --- |
| เปลี่ยนค่าข้อมูลของ Struct แล้วค่าจริงภายนอกไม่ยอมเปลี่ยน | เมธอดเป็น Value Receiver ไม่ใช่ Pointer Receiver | เติมเครื่องหมาย `*` หน้า Receiver เช่น `(w *Wallet)` |
| โปรแกรมเด้งพังดื้อ ๆ `runtime error: invalid memory address or nil pointer dereference` | พยายามใช้งานตัวแปรประเภท Pointer ที่ยังมีค่าเป็น `nil` (ไม่มีที่อยู่หน่วยความจำจริง) | ตรวจสอบค่าเสมอว่าไม่ใช่ `nil` ก่อนทำการใช้งานพอยน์เตอร์ |
| เทสต์พังเมื่อเปรียบเทียบ `err.Error() == "some string"` | ข้อความ Error มีการเปลี่ยนแปลงคำ ทำให้เทสต์พังง่าย (Flaky Test) | ออกแบบโดยคืนตัวแปร Error ที่สร้างด้วย `errors.New` จากจุดเดียว และใช้เปรียบเทียบตัวแปรนั้นตรง ๆ (Sentinel Error) |
| เทสต์ผ่านแต่ซ่อนบั๊กเพราะไม่ได้เช็คผลลัพธ์ของ `error` ที่คืนมา | ลืมเรียกตรวจสอบค่า error ที่ได้จากฟังก์ชันฝั่งที่เรียกใช้งาน | นำ linter อย่าง `errcheck` มาช่วยสแกนโค้ด และเขียนโค้ดเช็คผลลัพธ์ error ทุกครั้ง |

## สรุป

- **Pointer (`*T`)** คือ ตัวเก็บตำแหน่งที่อยู่หน่วยความจำของข้อมูลตัวจริง ช่วยให้แก้ไขข้อมูลดั้งเดิมและลดการก๊อปปี้ข้อมูลขนาดใหญ่ได้
- **สัญลักษณ์ `&`** ใช้สำหรับดึงที่อยู่หน่วยความจำของตัวแปร (Address of) และ **`*`** ใช้สำหรับอ้างอิงข้อมูลในตำแหน่งนั้น (Dereferencing)
- **Automatic Dereferencing** ของ Go ทำให้เราเข้าถึงฟิลด์สตรักเจอร์ผ่าน pointer ได้โดยตรงด้วยสัญลักษณ์ `.` (เช่น `w.balance`)
- **Error** ใน Go เป็น "ค่าข้อมูลทั่วไป" (Value) ไม่ใช่ Exception — ต้องส่งคืนกลับมาตรวจสอบและจัดการเสมอ
- **Sentinel Errors** คือการแยกแยะ error ออกมาเป็นตัวแปรแบบ public ช่วยให้โค้ดเปรียบเทียบความผิดพลาดได้ง่ายและยืดหยุ่น

## ลองทำต่อ

1. ทดลองย้ายฟังก์ชันตัวช่วยของเทสต์ (`assertBalance`, `assertError`, `assertNoError`) ออกไปนอกฟังก์ชัน `TestWallet` เพื่อจัดระเบียบโค้ดให้อ่านง่ายขึ้น
2. ทดลองดาวน์โหลดและใช้งาน `errcheck` เพื่อสแกนดูว่าในโปรเจกต์ของคุณมีส่วนไหนที่ยังไม่ได้ตรวจสอบ Error บ้าง
3. ลองปรับปรุง `Wallet` ให้มีเมธอดดึงเงินหรือโอนเงินระหว่าง Wallet สองใบดู โดยใช้ประโยชน์จาก Pointer

---

**เกี่ยวข้อง:** [[arrays-n-slices]] · **อัปเดตล่าสุด:** 2026-06-12
