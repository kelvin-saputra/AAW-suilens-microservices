# Suilens Microservice System

Sistem penyewaan lensa kamera berbasis arsitektur *microservices* menggunakan Node.js (Elysia.js, Vite/Vue.js) dan Docker Compose.

## Persyaratan Sistem

Sebelum menjalankan proyek ini, pastikan telah menginstal:
- **Docker** & **Docker Compose**
- **Node.js** (opsional, jika ingin menjalankan layanan secara lokal tanpa Docker)

## Struktur Layanan

Sistem ini terdiri dari beberapa *microservices* berikut:
1. **Catalog Service** (Port `3001`): Menangani data katalog lensa.
2. **Order Service** (Port `3002`): Menangani pembuatan dan pembatalan pesanan.
3. **Notification Service** (Port `3003`): Memberikan notifikasi asinkronus (berlangganan ke message broker).
4. **Inventory Service** (Port `3004`): Menangani pencatatan stok dan pelepasan / pe-reservasi-an lensa berdasarkan cabang.
5. **Frontend Application** (Port `5173`): Antarmuka UI menggunakan Vue 3 dan Vuetify untuk melihat katalog produk dan menempatkan pesanan.

Selain aplikasi terdapat beberapa supporting services untuk membantu service utama berjalan seperti:
- **RabbitMQ** (Port `5672` dan `15672` untuk manajemen): Message Broker.
- **PostgreSQL** (*multiple databases* di port 5433, 5434, 5435, 5436): Basis data terisolasi untuk masing-masing layanan.

## Cara Menjalankan (dengan Docker)

Cara termudah untuk menyiapkan dan menjalankan seluruh sistem secara otomatis adalah menggunakan Docker Compose.

1. Buka terminal (atau Command Prompt / PowerShell) dan arahkan ke direktori proyek ini.
2. Jalankan perintah berikut untuk membangun (*build*) image dan menjalankan kontainer:

   ```bash
   docker compose up -d --build
   ```

3. Docker akan mengunduh dependensi (termasuk *image* PostgreSQL dan RabbitMQ) dan mem-build layanan secara otomatis.
4. **Data Seed**: Inventory service (dan layanan lainnya) akan secara otomatis mengeksekusi skrip *seeding* saat *startup* untuk memuat data dummy awal cabang dan stok lensa.

## Cara Mengakses Aplikasi

Setelah seluruh *container* dinyatakan sehat (`Healthy`) dan berjalan:

- **Frontend Application** dapat diakses melalui browser di: [http://localhost:5173](http://localhost:5173) (atau [http://127.0.0.1:5173]())
- RabbitMQ Management Dashboard dapat diuji di: [http://localhost:15672](http://localhost:15672) (Login bawaan: `guest` / `guest`).

## Menghentikan Sistem

Untuk mematikan sistem saat sudah selesai:

```bash
docker compose down
```

*Catatan: Menjalankan opsi `docker compose down -v` akan menghapus seluruh data pada volume persisten jika ingin mereset state basis data.*
