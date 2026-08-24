.PHONY: install migrate seed run worker beat test build front

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

migrate:
	cd backend && python manage.py makemigrations && python manage.py migrate

seed:
	cd backend && python manage.py seed_demo

run:
	cd backend && python manage.py runserver

front:
	cd frontend && npm run dev

worker:
	cd backend && celery -A config worker -l info

beat:
	cd backend && celery -A config beat -l info

test:
	cd backend && python manage.py test

build:
	cd frontend && npm run build
