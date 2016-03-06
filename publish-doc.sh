read -p 'Commit message: ' msg
if [ -f doc ]; then
	rm -rf doc
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
