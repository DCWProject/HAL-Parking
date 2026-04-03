from decouple import config


class Settings:
    DEBUG: bool = config("DEBUG", default=True, cast=bool)
    PROJECT_NAME: str = config("PROJECT_NAME", default="Smart Parking System")
    API_V1_STR: str = config("API_V1_STR", default="/api/v1")
    BACKEND_CORS_ORIGINS: list[str] = config(
        "BACKEND_CORS_ORIGINS",
        default="http://localhost,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
        cast=lambda v: [s.strip() for s in v.split(",")],
    )

    # Database
    POSTGRES_USER: str = config("POSTGRES_USER", default="postgres")
    POSTGRES_PASSWORD: str = config("POSTGRES_PASSWORD", default="root")
    POSTGRES_SERVER: str = config("POSTGRES_SERVER", default="localhost")
    POSTGRES_PORT: str = config("POSTGRES_PORT", default="5432")
    POSTGRES_DB: str = config("POSTGRES_DB", default="smart_parking_db")
    DATABASE_URL: str = config("DATABASE_URL", default=None)

    # JWT
    SECRET_KEY: str = config(
        "SECRET_KEY",
        default="09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7",
    )
    ALGORITHM: str = config("ALGORITHM", default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = config(
        "ACCESS_TOKEN_EXPIRE_MINUTES", default=60 * 24, cast=int
    )

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


settings = Settings()
