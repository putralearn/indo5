package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	_ "github.com/lib/pq"
)

var db *sql.DB

func main() {
	var err error
	connStr := "host=localhost user=postgres password=yourpass dbname=indo5 sslmode=disable"
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	createTable()

	http.HandleFunc("/api/check-duplicate", checkDuplicate)
	http.HandleFunc("/api/submit-form", submitForm)
	http.Handle("/", http.FileServer(http.Dir("./static")))

	fmt.Println("Server jalan di :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// ===== BUAT TABEL =====
func createTable() {
	query := `
    CREATE TABLE IF NOT EXISTS pelamar (
        id          SERIAL PRIMARY KEY,
        nik         VARCHAR(16) UNIQUE NOT NULL,
        email       VARCHAR(255) UNIQUE NOT NULL,
        nama        TEXT,
        alamat      TEXT,
        created_at  TIMESTAMP DEFAULT NOW()
    );`
	_, err := db.Exec(query)
	if err != nil {
		log.Fatal("Gagal buat tabel:", err)
	}
}

// ===== CEK DUPLIKAT =====
func checkDuplicate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", 405)
		return
	}

	var body struct {
		NIK   string `json:"nik"`
		Email string `json:"email"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	// Cek NIK
	var count int
	db.QueryRow("SELECT COUNT(*) FROM pelamar WHERE nik = $1", body.NIK).Scan(&count)
	if count > 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"duplicate": true,
			"field":     "nik",
			"message":   "NIK sudah terdaftar",
		})
		return
	}

	// Cek Email
	db.QueryRow("SELECT COUNT(*) FROM pelamar WHERE email = $1", body.Email).Scan(&count)
	if count > 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"duplicate": true,
			"field":     "email",
			"message":   "Email sudah terdaftar",
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"duplicate": false,
	})
}

// ===== SUBMIT FORM =====
func submitForm(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", 405)
		return
	}

	r.ParseMultipartForm(10 << 20) // max 10MB

	nik := r.FormValue("nik") // sesuaikan name di HTML
	email := r.FormValue("email")
	nama := r.FormValue("nama")
	alamat := r.FormValue("alamat")

	// Validasi NIK 16 digit
	if len(nik) != 16 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "NIK harus 16 digit",
		})
		return
	}

	_, err := db.Exec(
		"INSERT INTO pelamar (nik, email, nama, alamat) VALUES ($1, $2, $3, $4)",
		nik, email, nama, alamat,
	)

	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Data sudah terdaftar atau error: " + err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Data berhasil disimpan",
	})
}
