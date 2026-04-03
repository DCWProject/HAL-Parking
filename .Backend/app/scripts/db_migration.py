import subprocess
import os
import sys


def run_command(cmd, cwd):
    """
    Run a shell command safely and return (success, output)
    """
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stdout + e.stderr


def detect_model_changes(dry_run_output: str) -> bool:
    """
    Detect whether Alembic autogenerate found schema changes.
    """
    if "FAILED" in dry_run_output:
        raise RuntimeError("Alembic autogenerate failed")

    # Empty migration case
    if "def upgrade():\n    pass" in dry_run_output:
        return False

    KEYWORDS = (
        "op.create",
        "op.drop",
        "op.add",
        "op.alter",
        "op.execute",
        "op.create_index",
        "batch_op",
    )

    return any(k in dry_run_output for k in KEYWORDS)


def main():
    # Resolve backend directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.abspath(os.path.join(script_dir, "../../"))

    print(f"\nBackend directory: {backend_dir}")

    # --- Step 1: Check for unapplied migrations ---
    print("\nChecking unapplied migrations...")
    ok_cur, cur = run_command(["alembic", "current"], backend_dir)
    ok_head, head = run_command(["alembic", "heads"], backend_dir)

    if not ok_cur or not ok_head:
        print("Failed to read Alembic state")
        print(cur or head)
        sys.exit(1)

    if cur.strip() != head.strip():
        print("⚠️  WARNING: There are unapplied migrations!")
        print(f"   Current: {cur.strip()}")
        print(f"   Head   : {head.strip()}")
        apply = input("Apply pending migrations now? [Y/n]: ").strip().lower()
        if apply in ("", "y", "yes"):
            ok, out = run_command(["alembic", "upgrade", "head"], backend_dir)
            if not ok:
                print("Migration failed")
                print(out)
                sys.exit(1)
            print("Pending migrations applied")
        else:
            print("Please resolve pending migrations first.")
            sys.exit(1)

    # --- Step 2: Detect model changes ---
    print("\nDetecting model changes (dry-run autogenerate)...")
    ok, output = run_command(
        ["alembic", "revision", "--autogenerate", "--dry-run"],
        backend_dir,
    )

    if not ok:
        print("Alembic dry-run failed:")
        print(output)
        sys.exit(1)

    try:
        has_changes = detect_model_changes(output)
    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)

    if not has_changes:
        print("No model changes detected. DB schema is up to date.")
        return

    print("\nModel changes detected!")

    # --- Step 3: Create migration ---
    message = input("Enter migration message: ").strip()
    if not message:
        print("Migration message is required")
        sys.exit(1)

    print("\nCreating migration...")
    ok, out = run_command(
        ["alembic", "revision", "--autogenerate", "-m", message],
        backend_dir,
    )

    if not ok:
        print("Failed to create migration")
        print(out)
        sys.exit(1)

    print("Migration file created")

    # --- Step 4: Apply migration ---
    apply = input("Apply migration now? [Y/n]: ").strip().lower()
    if apply in ("", "y", "yes"):
        ok, out = run_command(["alembic", "upgrade", "head"], backend_dir)
        if not ok:
            print("Migration apply failed")
            print(out)
            sys.exit(1)
        print("Database upgraded successfully")
    else:
        print("Migration created but not applied")


if __name__ == "__main__":
    main()
