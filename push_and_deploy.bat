@echo off
echo Preparing to Push and Deploy to GitHub...
git add .
git commit -m "Fix deployment: Monorepo routing for React and FastAPI"
echo Pushing to GitHub...
git push origin main
echo.
echo ===================================================
echo DONE! Check your Vercel or GitHub dashboard now.
echo ===================================================
pause
