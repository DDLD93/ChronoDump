# Mongo Backup Scheduler (TypeScript)

A production-ready, open-source Dockerized service that backs up **every MongoDB database into separate, timestamped archives** on a schedule.

---

## ✨ Key features

* **Per-database archives**: one `.gz` archive per database (e.g., `mydb_2025-11-05T22-01-33Z.archive.gz`).
* **Consistent UTC timestamps** in ISO-8601 (safe for filenames).
* **Cron scheduling** via `node-cron`.
* **Retention policy** (delete old archives after N days).
* **Atomic writes**: use `.part` temp files then rename on success.
* **Structured logging** with Pino.
* **Health endpoint** (`/healthz`) and optional Prometheus `/metrics`.
* **Dockerized** with `mongodb-database-tools` installed for `mongodump`.
* **Optional S3/MinIO upload** (toggle via env).

---

## 📂 Repository structure

```
mongo-backup-scheduler/
├─ docker-compose.yml
├─ Dockerfile
├─ package.json
├─ tsconfig.json
├─ .env.example
├─ README.md
├─ scripts/
│  └─ restore.sh
└─ src/
   ├─ index.ts
   ├─ scheduler.ts
   ├─ backup.ts
   ├─ mongo.ts
   ├─ logger.ts
   ├─ config.ts
   ├─ server.ts
   ├─ utils/
   │  └─ time.ts
   └─ uploader/
      └─ s3.ts
```

---

## 🛠️ Setup

### 1) Prerequisites

* Docker & Docker Compose
* (Optional) S3/MinIO credentials

### 2) Configure environment

Copy and edit `.env`:

```bash
cp .env.example .env
```

Set `MONGO_URI` (omit database suffix to include **all DBs**), choose `BACKUP_CRON`, retention, and S3 options if needed.

### 3) Build & run

```bash
docker compose up -d --build
```

### 4) Verify health

```bash
curl -fsS http://localhost:8080/healthz
```

### 5) Force a backup now

```bash
curl -X POST http://localhost:8080/backup-now
```

### 6) Check outputs

Backups appear under `./backups/` as **separate archives per DB**:

```
backups/
  mydb_2025-11-05T22-01-33Z.archive.gz
  otherdb_2025-11-05T22-01-34Z.archive.gz
```

### 7) Restore

```bash
./scripts/restore.sh backups/mydb_2025-11-05T22-01-33Z.archive.gz mongodb://localhost:27017
```

---

## 🔒 Security & production tips

* Create a dedicated Mongo user with the `backup` role and `authSource=admin`.
* Store secrets in Docker/Swarm/Kubernetes secrets, not plain envs when possible.
* Run the backup service on a node with enough CPU/disk; `--gzip` is CPU-intensive.
* Dump from a **secondary** in a replica set for minimal primary impact.
* Monitor disk usage; consider S3 offloading.

---

## 🔭 Roadmap

* Parallelize dumps by DB with a worker pool
* Telegram/Slack notifications
* Web UI to list/download archives
* GPG encryption at rest
* Kubernetes Helm chart

---

## 🪪 License

MIT

