# Live Regex Find/Replace

![GitHub release (latest by date)](https://img.shields.io/github/v/release/HelixCraft/obsidian-regex-replace)
![GitHub downloads](https://img.shields.io/github/downloads/HelixCraft/obsidian-regex-replace/total)

**Live Regex Find/Replace** is a powerful plugin for Obsidian that brings full Regular Expression (Regex) support to your find and replace operations. It features a modern **Live Preview** that highlights matches in real-time as you type, giving you visual feedback similar to native editors.

<img width="1496" height="531" alt="grafik" src="https://github.com/user-attachments/assets/df84a1e5-51f8-4c75-bfe7-ebaa7acb8c61" />

## Features

- **Regex Support**: Utilize the full power of Javascript Regular Expressions.
- **Live Find Preview**: Matches are highlighted instantly with a clear box style as you type your pattern or plain text.
- **Scope Control**:
  - **Document**: Apply changes to the entire note.
  - **Selection**: Restrict find/replace to only the currently selected text.
- **Advanced Replacements**:
  - Support for `\n` (newline) and `\t` (tab).
  - Support for Regex capture groups (e.g., `$1`, `$2`) to reorder or reformat data.
- **User Friendly**:
  - **Case Insensitivity**: Toggle with a single click.
  - **Pre-fill**: Automatically populates the find field with your selection.
  - **Theme Aware**: Seamlessly integrates with Obsidian's light and dark modes.

## Installation

### Via Community Plugins
1. Open **Settings** > **Community Plugins** in Obsidian.
2. Ensure **Restricted Mode** is **off**.
3. Click **Browse** and search for `Regex Find/Replace`.
4. Click **Install** and then **Enable**.

### Manual Installation
1. Download the latest release (`main.js`, `manifest.json`, `styles.css`) from the [Releases Page](https://github.com/HelixCraft/obsidian-regex-replace/releases).
2. Create a folder named `live-regex-find-replace` in your vault's plugin folder: `.obsidian/plugins/`.
3. Move the downloaded files into this folder.
4. Reload Obsidian plugins and enable it in settings.

## Usage

1. **Open the Dialog**:
   - Press the default hotkey `Ctrl + Alt + F` (`Cmd + Alt + F` on Mac).
   - Alternatively, use the Command Palette (`Ctrl/Cmd + P`) and run `Regex Find/Replace: Find and Replace using regular expressions`.

2. **Finding Text**:
   - Type your Regex or text in the "Find" box.
   - Matches will be highlighted in the editor immediately.

3. **Replacing Text**:
   - Type your replacement string.
   - Use `$1`, `$2`, etc., for capture groups if using Regex.
   - Use `\n` for newlines.

4. **Controls**:
   - `.*` **Regex Mode**: Toggles regular expression parsing on/off.
   - `Aa` **Case Sensitivity**: Toggles case-sensitive matching.
   - `⊏⊐` **Selection Only**: Limits scope to your selected text (only available if text is selected).
   - `▼` **History**: Shows previously searched terms (last 10, persisted between sessions).
   - `↑` / `↓` **Previous/Next**: Jumps between matches. Same keys also work with Enter (next), Shift+Enter (previous), and the Arrow keys in the Find field.
   - `×` **Close**: Closes the dialog (Esc works too).

5. **Execute**: Click **Replace All** to apply changes.

## Settings

- **Process \n as line break**: Interprets `\n` characters in the replacement field as actual newlines.
- **Prefill Find Field**: If enabled, selecting text before opening the dialog will auto-paste it into the Find box.
- **Case Insensitive**: Sets the default state for case sensitivity.

## Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

## License

MIT License - Copyright (c) 2026 HelixCraft
*(Original work by Martin Eder)*
