
build: components
	component build

components:
	component install

dist: components
	component build -o . -s SlantControls -n slant-controls

example: example.html
example.html: dev

dev:
	component install --dev
	component build --dev

.PHONY: build
