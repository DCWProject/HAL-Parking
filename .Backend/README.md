# Smart Parking Management System - Backend

## Tech Stack

- FastAPI
- PostgreSQL
- SQLAlchemy
- Pydantic
- JWT Authentication

## Setup

1. **Create Virtual Environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate     # Windows
   ```

2. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Database Configuration**

   - Ensure PostgreSQL is running.
   - Create a database named `smart_parking_db` (or update `POSTGRES_DB` in `app/core/config.py` or via `.env`).
   - Default credentials are `postgres:password`. Update `.env` if different.

   **Run Migration**

   ```bash
   python -m alembic init alembic

   python -m alembic revision --autogenerate -m "<message>"
   # verify the migration file /alembic/versions/<migration_file>.py
   python -m alembic upgrade head
   ```

4. **Run Application**
   ```bash
   uvicorn app.main:app --reload
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Usage

- **Swagger UI**: Visit `http://127.0.0.1:8000/docs`
- **Create Admin**: python -m app.scripts.create_admin

## Structure

- `app/main.py`: Entry point.
- `app/core`: Configuration & Database.
- `app/models`: SQLAlchemy Models.
- `app/schemas`: Pydantic Schemas.
- `app/api`: API Endpoints.
- `app/dependencies`: Dependency Injection.
