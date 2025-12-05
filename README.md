# Transcendence

## Docker ile Hızlı Başlangıç

```bash
make run              # Uygulamayı derle ve başlat
```

Uygulama şu adreste erişilebilir olacak: **http://localhost**

### Diğer Docker Komutları

```bash
make build            # İmajları oluştur
make up               # Konteynerleri başlat
make down             # Konteynerleri durdur
make restart          # Yeniden başlat
make logs             # Logları görüntüle
make clean            # Her şeyi sil (imajlar, volume'lar, konteynerler)
make ps               # Aktif konteynerleri görüntüle
```

## Yerel Geliştirme (Docker olmadan)

```bash
nvm use 22
npm install           # Client + server bağımlılıklarını yükle
npm run dev           # Client + server'ı watch modunda başlat (her dosya kaydedildiğinde yeniden başlar)
```

Sunucu şu adreste erişilebilir: **http://localhost:8080**

### Kullanılabilir Komutlar

```bash
npm run build         # Tüm projeyi derle
npm start             # Sunucuyu başlat
npm run clean         # Oluşturulan dosyaları temizle

# Özel komutlar
npm run dev:client    # Client watch modunda
npm run dev:server    # Server watch modunda
npm run build:client  # Sadece client'ı derle
npm run build:server  # Sadece server'ı derle
```

## Docker Mimarisi

```

  http://localhost:8080              
   
           NGINX                   
    - Statik dosyaları sunar       
    - Reverse proxy                
   
              Proxy /game           
                                     
   
     SERVER (Dahili Port 8080)     
    - WebSocket /game              
    - API endpoints                
   

       Docker Network: transcendence
```

### Servisler

- **nginx** : Port 8080'de reverse proxy, statik dosyaları sunar
- **server** : Port 8080'de Node.js/Fastify backend (sadece dahili)
- **client** : Builder, TypeScript derler ve statik dosyaları oluşturur

## Hata Ayıklama

```bash
# Belirli bir servisin logları
docker compose logs -f nginx
docker compose logs -f server

# Bir konteynere erişim
docker compose exec nginx sh
docker compose exec server sh

# Bir servisi yeniden oluştur
docker compose build server
docker compose up -d server
```

## Sorun Giderme

**Port 8080 zaten kullanımda:**
```bash
sudo lsof -i:8080
# docker-compose.yml'de portu değiştir
```

**Sunucu döngüde yeniden başlıyor:**
```bash
make logs             # Hataları görüntüle
make clean && make run # Tam yeniden oluşturma
```

## Dosya Mimarisi
```bash
server/      # Backend (API, DB, iş mantığı)
    src/               # Sunucu TypeScript kaynağı
       controllers/   # API/WS Handler'ları (client mesajlarını alır, oyun mantığını çağırır, yanıt döner)
       models/        # Veri modelleri (oyun nesnelerinin tanımları: Ball, Paddle, Player, vb.)
       services/      # İş mantığı (oyun yönetimi, hesaplamalar, vb.)
       db/            # DB erişimi ve başlatma (bağlantı, sorgular)
       routes/        # HTTP/WS route tanımları
       utils/         # Yardımcı fonksiyonlar
       index.ts       # Sunucu ana giriş noktası
       types.ts       # Global tipler
    dist/              # Derlenmiş JS sunucu
    migrations/        # SQL dosyaları
    package.json
    tsconfig.json
    README.md
client/      # Frontend (SPA, assets, stiller)
    src/               # Client TypeScript/JS kaynağı (görüntüleme, input yönetimi)
    public/            # Statik dosyalar (index.html, resimler)
    dist/              # Client JS/CSS build
    package.json
    tsconfig.json
    README.md
nginx/       # Nginx yapılandırması (reverse proxy, TLS, WebSocket proxy)
    nginx.conf         # Nginx yapılandırma dosyası
migrations/  # Veritabanı SQL dosyaları
docs/        # Dokümantasyon
README.md    # <- Buradasınız
```
