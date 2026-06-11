package main

import "fmt"

func main() {
	type Product struct{ Price int }
	products := []Product{{Price: 10}, {Price: 20}}

	// ❌ วิธีที่ผิด (แก้ที่ตัว Copy)
	for _, v := range products {
		v.Price = v.Price * 2 // แก้ที่ตัวแปร v ซึ่งเป็นแค่ตัว Copy
	}
	fmt.Println(products[0].Price) // ผลลัพธ์: 10 <-- ราคาไม่เปลี่ยน!

	// ---------

	// วิธีที่ถูกต้อง (เข้าถึงผ่าน Index เพื่อแก้ที่ตัวแปรจริง)
	for i := range products {
		products[i].Price = products[i].Price * 2 // วิ่งไปแก้ที่ตำแหน่งในหน่วยความจำโดยตรง
	}
	fmt.Println(products[0].Price) // ผลลัพธ์: 20 <-- เปลี่ยนแปลงสำเร็จ
}
