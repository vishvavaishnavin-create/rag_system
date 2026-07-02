from sqlalchemy.orm import Session

from database import User


def find_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def find_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def find_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def find_all(db: Session) -> list[User]:
    return db.query(User).all()


def count_all(db: Session) -> int:
    return db.query(User).count()


def count_active(db: Session) -> int:
    return db.query(User).filter(User.is_active == True).count()  # noqa: E712


def create_user(
    db: Session,
    username: str,
    email: str,
    hashed_password: str,
    google_id: str | None = None,
    avatar_url: str | None = None,
    auth_provider: str = "local",
    is_admin: bool = False,
) -> User:
    user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        google_id=google_id,
        avatar_url=avatar_url,
        auth_provider=auth_provider,
        is_admin=is_admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_active_status(db: Session, user_id: int, is_active: bool) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    user.is_active = is_active
    db.commit()
    return user


def update_password(db: Session, user_id: int, hashed_password: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    user.hashed_password = hashed_password
    db.commit()
    return user


def update_tour_seen(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    user.has_seen_tour = True
    db.commit()
    return user


def delete_user(db: Session, user_id: int) -> bool:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True


def find_or_create_google_user(db: Session, google_user_info: dict) -> User:
    email = google_user_info["email"]
    user = find_by_email(db, email)
    if user:
        if google_user_info.get("picture") and user.avatar_url != google_user_info["picture"]:
            user.avatar_url = google_user_info["picture"]
            db.commit()
        return user

    base_username = email.split("@")[0]
    username = base_username
    counter = 1
    while find_by_username(db, username):
        username = f"{base_username}{counter}"
        counter += 1

    return create_user(
        db,
        username=username,
        email=email,
        hashed_password="",
        google_id=google_user_info["id"],
        avatar_url=google_user_info.get("picture"),
        auth_provider="google",
    )
