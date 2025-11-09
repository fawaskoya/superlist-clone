#!/bin/bash
# Script to push to GitHub once repository is created

echo "🔍 Waiting for repository to be created..."
echo "📝 Create it here: https://github.com/new?name=superlist-clone"
echo ""
echo "⏳ Checking every 5 seconds..."

while true; do
    if git ls-remote origin &>/dev/null; then
        echo "✅ Repository found! Pushing code..."
        git push -u origin main
        if [ $? -eq 0 ]; then
            echo "🎉 Successfully pushed to GitHub!"
            echo "🔗 Repository: https://github.com/fawaskoya/superlist-clone"
            break
        else
            echo "❌ Push failed. Please check your authentication."
            break
        fi
    else
        echo "⏳ Repository not found yet. Waiting..."
        sleep 5
    fi
done

