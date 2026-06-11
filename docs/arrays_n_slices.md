---
title: "Arrays & Slices — เรื่องของกล่องใส่ของ"
slug: arrays-n-slices
order: 1
prereq: [helloworld]
tags: [fundamental, types, collections]
summary: "Array กล่องความจุตายตัว vs Slice ตู้ขยายได้ — เมื่อไหร่ใช้อะไร และหลุมที่มือใหม่ตกบ่อย"
updated: 2026-06-11
---

# Arrays & Slices — เรื่องของกล่องใส่ของ

> สมมติคุณเพิ่งเขียนฟังก์ชันแรกเสร็จ แล้วอยากให้มันรับตัวเลขได้ "หลายๆ ตัว" — Go มีคำตอบสองคำที่หน้าตาคล้ายกัน แต่ความเป็นอยู่ต่างกันสุดขั้ว

## เรื่องของเรา

เราจะเขียนฟังก์ชัน `Sum` รับตัวเลขหลายตัว คืนผลรวม. ฟังดูง่าย — แต่ระหว่างทางจะเจอคำถามที่ต้องตอบ:

- ใส่ข้อมูลกี่ตัวดี? ถ้ามี 3 ตัวบ้าง 7 ตัวบ้าง?
- ถ้ารับมาเป็นชุดใหญ่ๆ ฟังก์ชันเดียวจะรับได้หมดไหม?
- ถ้าอยาก "รวมทั้งชุด" และ "รวมแค่ท้าย" จะ reuse โค้ดเดิมได้มั้ย?

คำตอบของ Go อยู่ที่ความแตกต่างระหว่าง **Array** กับ **Slice**.

## ปัญหาแรกที่เจอ — Array กล่องที่เปิดขนาดไม่ได้

Array ใน Go มี "ความจุตายตัว". ตอนประกาศต้องบอกว่าจะเก็บกี่ช่อง:

```go
nums := [5]int{1, 2, 3, 4, 5}  // เก็บได้แค่ 5
```

อยากเก็บ 4 ตัว? เปลี่ยนเป็น `[4]int` แล้วก็ต้องเปลี่ยน signature ของ `Sum` ตาม. อยากเก็บ 100 ตัว? ก็ต้องเปลี่ยนอีก. แย่กว่านั้น — array ขนาดต่างกันถือเป็น **type คนละตัว** ใน Go:

```go
var a [3]int
var b [4]int
// a = b  // ❌ compile error: cannot use b (type [4]int) as type [3]int
```

ถ้าเราเขียน `Sum(nums [5]int) int` วันนึงต้องรับ 6 ตัว ก็ต้องเขียนฟังก์ชันใหม่. ไม่ scale.

## ก่อนแก้ — แบบ naive (array)

```go
package arraysnslices

func Sum(numbers [5]int) int {
	sum := 0
	for _, n := range numbers {
		sum += n
	}
	return sum
}
```

ทดสอบ:

```go
package arraysnslices

import "testing"

func TestSum(t *testing.T) {
	numbers := [5]int{1, 2, 3, 4, 5}

	got := Sum(numbers)
	want := 15

	if got != want {
		t.Errorf("got %d want %d given, %v", got, want, numbers)
	}
}
```

ผ่าน. แต่พอเปลี่ยน input เป็น `[6]int` ก็พังทันที.

## หลังแก้ — แบบ idiomatic (slice)

```go
package arraysnslices

func Sum(nums []int) int {
	sum := 0
	for _, n := range nums {
		sum += n
	}
	return sum
}
```

```go
package arraysnslices

import "testing"

func TestSum(t *testing.T) {
	t.Run("collection of 5 numbers", func(t *testing.T) {
		numbers := []int{1, 2, 3, 4, 5}

		got := Sum(numbers)
		want := 15

		if got != want {
			t.Errorf("got %d want %d given, %v", got, want, numbers)
		}
	})
}
```

ต่างกันแค่เปลี่ยน `[5]int` → `[]int` แต่ชีวิตดีขึ้นเยอะ:

- รับได้กี่ตัวก็ได้
- ฟังก์ชันเดียวใช้ได้กับทุกขนาด
- ใช้ `t.Run` ซ้อน subtest ได้ — เติม test case ใหม่โดยไม่แก้ signature

## Slice คืออะไร — มองให้เห็นภาพ

Slice ไม่ใช่ array. มันเป็น "หน้าต่าง" ที่ชี้ไปยัง array อีกที:

```
slice header (บน stack):        backing array (บน heap):
┌─────────────┐                 ┌───┬───┬───┬───┬───┐
│ ptr ────────┼────────────────►│ 1 │ 2 │ 3 │ 4 │ 5 │
│ len = 5     │                 └───┴───┴───┴───┴───┘
│ cap = 5     │
└─────────────┘
```

- `ptr` — ชี้ไปยังช่องแรกที่ slice "มองเห็น"
- `len` — มองเห็นกี่ช่อง (`numbers[0..len)`)
- `cap` — นับจาก ptr จนสุด array ที่รองรับ

เวลา `numbers[1:3]` คุณแค่เลื่อน `ptr` กับปรับ `len` — ไม่ได้สร้าง array ใหม่. **การ slice ไม่ได้ copy ข้อมูล** แค่เปลี่ยนมุมมอง.

## Append — ขยายตู้ได้ แต่มี trick

```go
nums := []int{1, 2, 3}
nums = append(nums, 4)
```

ถ้า backing array ยังเหลือที่ (`cap > len`) → append ใส่ของลงช่องเดิม, ไม่มีการสร้าง array ใหม่.
ถ้าเต็ม → Go จัดสรร array ใหม่ (ปกติใหญ่ขึ้น 2 เท่า) แล้ว **copy ของเก่าลงไป**.

```go
a := []int{1, 2, 3, 4}
b := a[:2]   // b มองเห็น [1, 2] แต่ cap = 4
b = append(b, 99)  // cap ยังเหลือ → แอบเขียนทับ a[2]!
fmt.Println(a)     // [1 2 99 4]  ← surprise!
```

นี่คือ "หลุม" ที่โดนบ่อยที่สุด.

## ทำไมต้องรู้เรื่องนี้

- **90% ของเวลาที่ใช้ array ใน Go = ใช้ slice ไม่ใช่ array จริงๆ** แม้แต่ `os.Args`, `strings.Split`, การ loop ด้วย `range` — ล้วนคืน slice
- รู้เรื่อง backing array ช่วยให้ debug เรื่อง "ทำไมข้อมูลเปลี่ยนที่อื่นด้วย" ได้
- ฟังก์ชันที่ "รับข้อมูลชุด" แทบทั้งหมดใน stdlib รับ slice ไม่ใช่ array — ออกแบบ API ของคุณให้สอดคล้อง
- เข้าใจ `len` vs `cap` ช่วยตัดสินใจเรื่อง performance: pre-allocate ด้วย `make([]int, 0, 1000)` แทน append ไปเรื่อย

## หลุมที่เจอบ่อย

| อาการ | สาเหตุ | วิธีแก้ |
| --- | --- | --- |
| `a` เปลี่ยนค่าทั้งที่แก้แค่ `b := a[1:3]` | slice แชร์ backing array | `b := append([]int(nil), a...)` หรือ `slices.Clone(a)` |
| `append` แล้วของเก่าหาย | reallocation, pointer เก่าชี้ array เก่า | เก็บ `nums = append(nums, x)` กลับเข้าตัวแปรเดิมเสมอ |
| เทียบ slice ด้วย `==` แล้วพัง | slice เปรียบเทียบได้แค่กับ `nil` | ใช้ `slices.Equal(a, b)` (Go 1.21+) |
| ใส่ของเยอะๆ แล้วช้า | append เจอ realloc บ่อย | `make([]T, 0, expectedSize)` ตั้งแต่แรก |
| แก้ element ใน loop แล้วไม่เห็นผล | `for _, v := range s` copy ค่า ไม่ใช่ ref | `for i := range s { s[i] = ... }` |

## สรุป

- **Array** = กล่องขนาดตายตัว, แทบไม่ได้ใช้ตรงๆ ใน Go
- **Slice** = header 3 ค่า (ptr, len, cap) ที่ชี้ไป array — ใช้แทน array เกือบทุกกรณี
- `append` อาจจะ reallocate — ต้อง assign กลับเสมอ
- Slice แชร์ backing array → ระวัง side effect ข้าม slice

## ลองทำต่อ

1. เขียน `SumAll([]int, []int) []int` คืน slice ของผลรวมแต่ละชุด — ใช้ `append` ใน loop
2. เขียน `SumAllTails(...[]int) []int` คืนผลรวม "ทุกตัวยกเว้นตัวแรก" — ต้องระวัง empty slice (hint: `nil` กับ `[]int{}` ต่างกัน)
3. เขียน benchmark ด้วย `func BenchmarkSum(b *testing.B)` เทียบ `make([]int, 0, 1000)` กับ append เปล่าๆ — cap เริ่มต้นต่างกันเท่าไหร่ถึงเห็นชัด?

ดูเฉลยได้ที่ `arrays_n_slices/` ใน repo.

---

**เกี่ยวข้อง:** [[helloworld]] · **อัปเดตล่าสุด:** 2026-06-11
