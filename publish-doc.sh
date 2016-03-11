read -p 'Commit message: ' msg
if [ -f doc ]; then
	rm -rf doc
fi
if [[ `git rev-parse --abbrev-ref HEAD` != "master" ]]; then
	git checkout master || exit 1
fi

npm run doc
git add -A
git commit -m "$msg"
git checkout gh-pages
git checkout master -- doc
mv doc/* .
rmdir doc
git add -A
git commit -m "$msg"
git push origin gh-pages
git checkout master
# And finally remove the docs...
git reset --hard HEAD~1
