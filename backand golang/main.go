package main

import (
	"fmt"
	"net/http"
)

func main() {
	port := "8080"
	fs := http.FileServer(http.Dir("./tampilan user"))
	http.Handle("/", fs)
	fmt.Println("Server jalan di port " + port)
	http.ListenAndServe(":"+port, nil)
}
