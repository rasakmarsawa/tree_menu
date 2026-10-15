package main

import (
	"log"
	"net/http"
	"os"

	"github.com/example/backend/internal/database"
	"github.com/example/backend/internal/handler"
	"github.com/example/backend/internal/repository"
	"github.com/example/backend/internal/service"
)

func main() {
	dbPath := getEnv("DB_PATH", "./data/menu.db")
	db, err := database.InitDBFile(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	repo := repository.NewMenuRepository(db)
	svc := service.NewMenuService(repo)
	menuHandler := handler.NewMenuHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handler.Health)
	mux.HandleFunc("GET /hello", handler.Hello)

	mux.HandleFunc("POST /api/menu", menuHandler.Create)
	mux.HandleFunc("GET /api/menu/tree", menuHandler.GetTree)
	mux.HandleFunc("GET /api/menu/flat", menuHandler.GetFlattened)
	mux.HandleFunc("GET /api/menu/{id}", menuHandler.GetByID)
	mux.HandleFunc("GET /api/menu/{parentId}/children", menuHandler.GetChildren)
	mux.HandleFunc("PUT /api/menu/{id}", menuHandler.Update)
	mux.HandleFunc("DELETE /api/menu/{id}", menuHandler.Delete)
	mux.HandleFunc("POST /api/menu/reorder", menuHandler.Reorder)
	mux.HandleFunc("POST /api/menu/{id}/move", menuHandler.Move)

	handlerWithCORS := corsMiddleware(mux)

	server := &http.Server{
		Addr:    getEnv("SERVER_ADDR", ":8080"),
		Handler: handlerWithCORS,
	}

	log.Printf("Server starting on %s", server.Addr)
	log.Printf("Database: %s", dbPath)
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigin := "http://localhost:5173"

		if origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}