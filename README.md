# Obsidian Regex Find/Replace

![GitHub release (latest by date)](https://img.shields.io/github/v/release/HelixCraft/obsidian-regex-replace)
![GitHub downloads](https://img.shields.io/github/downloads/HelixCraft/obsidian-regex-replace/total)

**Regex Find/Replace** is a powerful plugin for Obsidian that enhances your editing workflow by bringing full Regular Expression (Regex) support to find and replace operations. 

Unlike the built-in search, this plugin offers **Live Preview** highlighting, robust Regex support, and targeted scope control (entire document vs. selection).

![Regex Find/Replace Preview](res/dialog.png)
*(Note: Screenshot may show older version, updated visuals feature native-like highlighting)*

## ✨ Features

- **Regex Support**: Use the full power of Javascript Regular Expressions to find and manipulate text.
- **Live Find Preview**: Matches are highlighted in real-time as you type your pattern, using a distinct "box" style similar to native find or Sublime Text.
- **Scope Control**: 
  - **Document**: Replace matches across the entire note.
  - **Selection**: Limit find and replace operations to just your current text selection.
- **Flexible Replacements**:
  - Use `\n` to insert newlines.
  - Use `\t` for tabs.
  - Use regex capture groups (e.g., `$1`, `$2`) in your replacement text to move data around.
- **Quality of Life**:
  - **Case Insensitivity**: Toggle case-insensitive matching (`/i` flag).
  - **Pre-fill**: Option to automatically fill the "Find" field with your currently selected text.
  - **Dark/Light Mode**: Fully theme-aware UI.

## 🚀 Installation

### Community Plugins
1. Open **Settings** > **Community Plugins**.
2. Turn off **Restricted Mode**.
3. Click **Browse** and search for `Regex Find/Replace`.
4. Click **Install** and then **Enable**.

### Manual Installation
1. Go to the [Releases](https://github.com/HelixCraft/obsidian-regex-replace/releases) page.
2. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
3. Create a folder named `obsidian-regex-replace` in your vault's plugin directory: `.obsidian/plugins/`.
4. Move the downloaded files into that folder.
5. In Obsidian, go to **Settings** > **Community Plugins** and reload the plugin list.
6. Enable **Regex Find/Replace**.

## 🛠 Usage

1. Open the dialog via the Command Palette: `Regex Find/Replace: Find and Replace using regular expressions`.
   - *Pro-tip: Assign a hotkey (like `Ctrl+Alt+F`) to this command for quick access.*
2. **Find**: Enter your Regex pattern or plain text. Matches will highlight immediately in the editor.
3. **Replace**: Enter your replacement text. Capture groups work here (e.g., `$1`).
4. **Flags**:
   - `.*`: Toggle Regex mode on/off.
   - `Aa`: Toggle Case Sensitivity.
   - `⊏⊐`: Toggle "Selection Only" mode (active only if text is selected).
5. Click **Replace All** to execute.

## ⚙️ Settings

- **Process \n**: Treat `\n` in the replace field as actual newlines.
- **Prefill Find Field**: Auto-copy selected text to the find box when opening the dialog.
- **Case Insensitive**: Default state for the case sensitivity toggle.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Maintained by [HelixCraft](https://github.com/HelixCraft)**.  
