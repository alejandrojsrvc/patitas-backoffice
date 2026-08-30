PNPM ?= pnpm

.PHONY: help dev build preview test start stop restart status logs

help:
	@echo "Patitas Backoffice"
	@echo ""
	@echo "  make dev                   Inicia Vite en modo desarrollo (sin PM2)"
	@echo "  make build                 Compila el proyecto"
	@echo "  make preview               Previsualiza el build de producción"
	@echo "  make test                  Ejecuta los tests"
	@echo "  make start                 Levanta este proceso con PM2 (modo dev)"
	@echo "  make stop                  Detiene este proceso en PM2"
	@echo "  make restart               Reinicia este proceso en PM2"
	@echo "  make status                Muestra el estado de PM2"
	@echo "  make logs                  Sigue los logs de este proceso en PM2"

dev:
	$(PNPM) dev

build:
	$(PNPM) build

preview:
	$(PNPM) preview

test:
	$(PNPM) test

PM2_STACK ?= $(abspath ../patitas/ecosystem.patitas.config.cjs)
PM2_PROCESS ?= patitas-backoffice

start:
	pm2 start $(PM2_STACK) --only $(PM2_PROCESS)
	pm2 save

stop:
	pm2 stop $(PM2_PROCESS)

restart:
	pm2 restart $(PM2_PROCESS)

status:
	pm2 status

logs:
	pm2 logs $(PM2_PROCESS)
