package iteration

import (
	"strings"
	"testing"
)

func Repeat(character string) string {
	var repeated strings.Builder
	for i := 0; i < 5; i++ {
		repeated.WriteString(character)
	}
	return repeated.String()
}

func BenchmarkRepeat(b *testing.B) {
	for b.Loop() {
		Repeat("a")
	}
}

func TestRepeat(t *testing.T) {
	repeated := Repeat("a")
	expected := "aaaaa"

	if repeated != expected {
		t.Errorf("expected %q but got %q", expected, repeated)
	}

}
