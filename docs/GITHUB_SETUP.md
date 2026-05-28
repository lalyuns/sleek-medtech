# GitHub setup

Local repository is already initialized at:

```powershell
C:\Users\User\rc_medtech
```

The first commit is:

```text
5e8fbda Initial rc_medtech baseline
```

GitHub CLI is installed, but it is not logged in yet. To create the remote repository after login:

```powershell
cd C:\Users\User\rc_medtech
gh auth login --web --hostname github.com
gh repo create lalyuns/rc_medtech --private --source . --remote origin --push
```

Use `--public` instead of `--private` if this project should be visible publicly like `sleek-medtech`.
