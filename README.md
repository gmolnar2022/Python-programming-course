# Introduction to Data Science and Programming – Quarto course site

## Open in VS Code

1. Install [Quarto](https://quarto.org/).
2. Install the **Quarto** extension in VS Code.
3. Open this folder in VS Code.
4. Open `index.qmd` or any lesson file.
5. Use **Quarto: Preview** from the Command Palette, or run:

```bash
quarto preview
```

## Render the complete website

```bash
quarto render
```

The rendered website is written to the `docs/` directory.

## GitHub Pages

Because the output directory is `docs/`, the repository can be configured in GitHub Pages to publish from the `main` branch and the `/docs` folder.

## Suggested workflow

- Keep public course notes and released exercises in this repository.
- Keep unreleased quizzes, tests, and solutions in a private instructor repository.
- Add current Google Colab screenshots under `assets/images/lesson01/` when needed.
