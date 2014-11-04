
build: components
	component build

components:
	component install

dist: components
	component build -o . -s SlantFrame -n slant-frame

example: example.html
example.html: dev

dev:
	component install --dev
	component build --dev

.PHONY: build
