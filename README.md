# Prow-A-Vocabulary-App-Built-with-AI
Prow｜自由定制的专业词汇本：拖拽排序词性、JSON 批量导入导出、剪贴板识别、背诵/默写模式，数据离线明文。背单词/记笔记/闪卡一条龙。 A customizable vocab builder for specialized terms: drag-and-drop word types, JSON import/export, clipboard detection, recite &amp; dictation, offline plain JSON. Vocab, notes, flashcards in one.
这个 App 基本上是跟 AI 结对编程搞出来的，新功能靠聊，修 bug 也靠聊。  
代码可能不优雅，但能用，而且一直在改。

---

## 它是干嘛的

简单说就是一个**能自由定制的单词本**，专门给需要记专业词汇的人用。  
你可以：

- 创建不同学科的单词本（比如生物化学一窝端）
- 每个单词能填英文、音标、缩写、名词、动词、形容词、副词、介词、连词、短语，还可以加例句
- 词性的显示顺序能**直接拖拽调整**，想把短语放最上面就拖上去
- 所有数据都是本地明文 JSON，随时导出，不联网也能用一辈子

---

## 比较特别的地方

### 1. 单词卡片想怎么改就怎么改

不像有些 App 强制固定字段，这里你可以只填自己想填的。词性能拖拽排序，还能新增“短语”这种类型，专业词汇常用的缩写也单独留了位置。

### 2. 复制一段文字就能导入

如果你在网页、PDF、聊天记录里看到一堆符合 JSON 格式的单词数据，**复制一下**，打开 Prow 进单词本，它就会弹出窗口问你要不要导入。  
（不会误识别普通文本，只有那种带 `[` `{` 的结构才会触发）

### 3. 批量导入文件

支持从手机里选 `.txt` `.json` `.md` `.csv` 等文件直接导入。格式必须是严格的 JSON 数组（就那种带括号的），一个单词一个对象。

### 4. 学背练一条龙

- **背**：先看英文，点一下显示翻译，然后选“下一个”还是“记错了”
- **默**：看释义输英文，对错自动判
- 权重会根据你的反应时间和忘记次数自动调整，记不住的会多出现

---

## 不足的地方

- **单词推送算法比较糙**：目前的权重只是简单乘除，没有间隔重复那种科学调度。未来会换成更靠谱的复习算法（SM-2 或者自己魔改的）
- UI 是纯手写 CSS，在平板上可能没专门适配
- 没有 iOS 版（只有 Android），因为我没 Mac 打包

---

## 安装方式

1. 下载 `app-debug.apk` 到手机
2. 直接安装（如果提示风险，选“继续安装”）
3. 开用

如果想自己打包：

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

生成的 APK 在 `android/app/build/outputs/apk/debug/` 里。

------

## 数据格式（导入导出都用这个）

一个单词长这样（JSON）：

json

```
{
  "w": "alanine",
  "pro": "/ˈæl.ə.niːn/",
  "a": "Ala/A",
  "n": "丙氨酸",
  "v": "合成丙氨酸",
  "phr": "alanine residue",
  "examples": ["Alanine is a non-polar amino acid."]
}
```



导入时多个单词就包在数组里 `[{...}, {...}]`。
导出也是这种格式，方便拿回来再用。

------

## 未来期望

- **真正的阅读器**：能打开 PDF / EPUB，长按查词加词库。如果你有 AI 的 Key，还能让它帮你总结段落、出例句（不会偷你的 Key）
- **平板手写**：像市面上常见的笔记软件一样，支持电容笔标注，手指翻页，圈词直接进单词本
- **统一的知识卡片**：单词、笔记、题目、闪卡都一个样，互相链接
- **离线到底**：所有数据都明文存手机，导出就是完整的，不怕哪天 App 不更新了

------

## 许可

本软件遵循 MIT 许可，你可以自由使用、修改、分享代码，
但不得将其用于任何商业目的。

------

# Prow — A Vocabulary App Built with AI

This app was basically pair-programmed with AI. New features? Chat. Bug fixes? Chat.
The code might not be pretty, but it works — and it keeps improving.

------

## What It Does

A **fully customizable vocabulary notebook** built for people who need to memorize specialized terms.

- Create separate notebooks for different subjects (e.g., biochemistry, law, medicine)
- Each word can include English, phonetic symbols, abbreviations, noun, verb, adjective, adverb, preposition, conjunction, phrase, and example sentences
- **Drag-and-drop** to reorder word types — put phrases at the top if you want
- All data is stored locally as plain JSON, export anytime, works completely offline

------

## Standout Features

### 1. Cards You Can Tweak However You Want

No forced fields. Fill only what you need. Rearrange word types by dragging, add “phrase” as a custom type, and keep a separate slot for abbreviations common in your field.

### 2. Import from Clipboard

Copy some JSON-formatted word data from a webpage, PDF, or chat log, then open Prow and enter any notebook. A pop-up will ask if you want to import it.
(It won’t mistake random text — only content starting with `[` or `{` triggers the prompt.)

### 3. Batch Import Files

Import directly from `.txt`, `.json`, `.md`, `.csv` and other text files on your phone. The content must be a strict JSON array, with each word as an object.

### 4. Learn, Recite, Dictate

- **Recite**: See the word, tap to reveal the translation, then tap “next” or “forgot”
- **Dictation**: See the definition and type the English word; correctness is auto-checked
- Weights adjust based on your response time and mistakes — harder words show up more often

------

## Current Limitations

- **Review algorithm is rough**: Weights are simple multiply/divide rules. A proper spaced-repetition algorithm (like SM-2) is on the roadmap
- UI is pure hand-rolled CSS, not optimized for tablets
- Android only — no iOS version yet (I don’t have a Mac)

------

## How to Install

1. Download `app-debug.apk` to your phone
2. Install it (tap “Install anyway” if warned)
3. Start using

To build it yourself:

bash

```
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```



The APK will be in `android/app/build/outputs/apk/debug/`.

------

## Data Format (used for both import & export)

A single word entry looks like this (JSON):

json

```
{
  "w": "alanine",
  "pro": "/ˈæl.ə.niːn/",
  "a": "Ala/A",
  "n": "丙氨酸",
  "v": "合成丙氨酸",
  "phr": "alanine residue",
  "examples": ["Alanine is a non-polar amino acid."]
}
```



Multiple words are wrapped in an array: `[{...}, {...}]`.
Exported files follow the same format — easy to re-import later.

------

## Roadmap (Maybe)

- **Tablet + stylus**: Finger to scroll, pen to write. Circle a word in a paper → send to vocabulary
- **Unified knowledge cards**: Words, notes, questions, flashcards all become one type of card, linkable and reviewable together
- **Real document reader**: Open PDF/EPUB, long-press to look up words and add to vocabulary. Bring your own AI key (like DeepSeek or a local model) to summarize paragraphs or generate example sentences — I won’t touch your key.
- **Offline forever**: All data stays as readable JSON on your device. Export whenever you want, never locked in.

------

## License

This project is released under the MIT License. You are free to use, modify, and share the code,
but commercial use is prohibited.
