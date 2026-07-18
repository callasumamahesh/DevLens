# DevLens 🔍

DevLens is a premium, context-aware Chrome Extension developer tool that transforms webpage inspection, styles playground manipulation, accessibility audits, and runtime error diagnostics into a unified, AI-enhanced sidebar assistant.

---

## 💡 The Origin Idea

Every day, web developers repeat a highly repetitive cycle when debugging applications:
1. Open the browser Console or Elements Inspector.
2. Notice a styled breakdown or runtime error (e.g. `Cannot read properties of undefined`).
3. Copy the stack trace or style block.
4. Switch tabs to a Search Engine, StackOverflow, or ChatGPT to ask why it happened and how to solve it.
5. Manually apply the fix in their IDE and reload.

**DevLens** was born to bridge this gap. By combining target CSS styling playgrounds, accessibility checkers, and a runtime **AI Debug Console** directly inside the extension side panel, DevLens provides instantaneous visual debugging and localized diagnostics without requiring developers to leave their workspace.

---

## 🛠️ Core Features & Architecture

Built on the modern **Chrome Extension Manifest V3** specifications, DevLens divides operations across specialized layers:

### 1. CSS Inspector & Styles Playground
* **Webpage Highlighting**: Mouse hover spotlights elements with neon bounding boxes and backdrop blurs, dynamically restricted to only fire when the *CSS Inspector* tab is active.
* **Computed styles & Box Model Layout**: Displays typography, spacing grids, and computes box borders/paddings on the fly.
* **Interactive Style Tweaker**: Contains sliding controllers coupled with an **interactive text editor** allowing developers to type custom CSS styles that are instantly injected into the target element's active style attributes.

### 2. Accessibility & Responsive Scanners
* Runs audits for WCAG contrast ratios, image alt markers, unlabelled inputs, and responsiveness scroll bottlenecks, summarizing items into PASS/FAIL diagnostics listings.

### 3. AI Debug Console
* **Main-World Logger Interception**: Injects a custom tracking script directly into the page execution context at `document_start` to capture console dumps, unhandled promise rejections, React warnings, and API fetch status codes (404/500), bypassing CSP headers.
* **Local Heuristic Engine**: Translates raw runtime exceptions into readable cards showing structural details:
  * **Why**: The root cause of the error.
  * **Suggested Fix / Suggested Code**: Interactive, syntax-highlighted code comparisons (Wrong vs. Correct).
  * **Suggested Checks**: Checklist items for immediate mitigation.
  * **Learn More**: Direct links to documentation (MDN, React Docs).

---

## 🧠 Current AI Diagnostics (Static Heuristics)

The debugger console currently employs an offline dictionary resolving error messages using regex maps to construct the diagnostic cards:
* **Undefined Array Iterators**: Traps calls to `.map()` / `.forEach()` on undefined values (common in React states) and suggests defaulting state schemas (`useState([])`) or using optional chaining (`list?.map()`).
* **Variable Scope Violations**: Traps ReferenceErrors and indicates scope checks.
* **Constants Reassignments**: Catches invalid assignments to `const` and shows correct reassignment declarations using `let`.
* **API Faults**: Converts 404/500 fetch requests to network verification steps.

---

## 🚀 The Future Roadmap (Dynamic AI integration)

While the current implementation uses rich, hand-crafted static rules to map errors onto diagnostic cards, the next major release will transition DevLens to **Dynamic AI Diagnostics**:

1. **Gemini API Integration**: Connecting the logger stream to the Gemini API to analyze custom stack traces in real time.
2. **Context-Aware Dynamic Suggestions**: The AI will read surrounding DOM structures, target styling files, and stack trace contexts to generate exact code diffs and personalized fixes on the fly.
3. **Dynamic CSS Generation**: An AI-assisted input playground where natural language commands (e.g., *"Make this look like a premium button"*) will dynamically translate into valid CSS rules.

---

## 📂 Project Structure

```
DevLens/
├── manifest.json            # Extension configuration (MV3 registration)
├── background.js            # Background service worker (side panel toggling)
├── content/
│   ├── logger.js            # MAIN world logger (CSP bypass runtime tracker)
│   ├── content.js           # Isolated world script (page messaging router)
│   ├── inspector.js         # CSS highlighter and inline style tweaker
│   ├── accessibility.js     # WCAG & screen reader accessibility scanners
│   └── responsive.js        # Responsive mobile viewport scanning scripts
└── sidepanel/
    ├── sidepanel.html       # Sidebar layout
    ├── sidepanel.css        # Premium typography & layouts styling
    └── sidepanel.js         # State controller & AI diagnostics compiler
```
