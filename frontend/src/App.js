import React, { useState } from "react";
import { parseDocument } from "htmlparser2";
import * as csstree from "css-tree";
import Editor from "@monaco-editor/react";

function App() {
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [htmlIssues, setHtmlIssues] = useState([]);
  const [cssIssues, setCssIssues] = useState([]);

  const handleAnalyze = () => {
    const htmlIssuesDetected = parseHTML(htmlCode);
    const cssIssuesDetected = parseCSS(cssCode);
    setHtmlIssues(htmlIssuesDetected);
    setCssIssues(cssIssuesDetected);
  };

  const parseHTML = (content) => {
    const doc = parseDocument(content);
    const issues = [];

    const tagsRequireClosing = [
      "div",
      "section",
      "article",
      "title",
      "html",
      "body",
      "head",
      "nav",
      "aside",
      "header",
      "form",
      "footer",
      "ul",
      "ol",
      "li",
      "p",
      "main",
      "label",
      "input",
      "textarea",
      "select",
      "a",
      "img",
      "video",
      "audio",
      "canvas",
      "svg",
      "iframe",
      "embed",
      "object",
      "picture",
      "source",
      "track",
      "strong",
      "b",
      "i",
      "em",
      "u",
      "s",
      "strike",
      "abbr",
      "acronym",
      "code",
      "kbd",
      "samp",
      "var",
      "cite",
      "q",
      "dfn",
      "address",
      "pre",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "time",
      "mark",
    ];

    tagsRequireClosing.forEach((tag) => {
      const openCount = (
        content.match(new RegExp(`<${tag}(\\s|>)`, "gi")) || []
      ).length;
      const closeCount = (content.match(new RegExp(`</${tag}>`, "gi")) || [])
        .length;
      if (openCount > closeCount) {
        const firstMatch = content.search(new RegExp(`<${tag}(\\s|>)`, "i"));
        const lineNumber = findLineNumber(firstMatch, content);

        issues.push({
          type: `Missing closing tag </${tag}>`,
          tag: `<${tag}>`,
          line: lineNumber,
          solution: `Add closing tag </${tag}>`,
        });
      }
    });

    const traverse = (node) => {
      if (!node) return;
      let index = node.startIndex;

      if (index == null && node.name) {
        const regex = new RegExp(`<${node.name}\\b`, "i");
        index = content.search(regex);
      }
      const lineNumber = findLineNumber(index, content);

      if (node.type === "tag") {
        if (node.name === "img" && !node.attribs?.alt) {
          issues.push({
            type: "Missing alt attribute",
            tag: "<img>",
            line: lineNumber,
            solution: 'Add alt="..." attribute in <img>',
          });
        }
        if (node.name === "html" && !node.attribs?.lang) {
          issues.push({
            type: "Missing lang attribute",
            tag: "<html>",
            line: lineNumber,
            solution: 'Add lang="en" in <html>',
          });
        }
        if (node.name === "a" && !node.attribs?.href) {
          issues.push({
            type: "Missing href in anchor tag",
            tag: "<a>",
            line: lineNumber,
            solution: 'Add href="..." in <a>',
          });
        }
        if (
          node.name === "label" &&
          !node.attribs?.for &&
          !node.attribs?.htmlFor
        ) {
          issues.push({
            type: "Missing htmlFor attribute",
            tag: "<label>",
            line: lineNumber,
            solution: 'Add htmlFor="..." in <label>',
          });
        }
        if (node.name === "button" && !node.attribs?.type) {
          issues.push({
            type: "Missing type attribute",
            tag: "<button>",
            line: lineNumber,
            solution: 'Add type="button" or type="submit" in <button>',
          });
        }
        if (node.name === "input" && !node.attribs?.name) {
          issues.push({
            type: "Missing name attribute",
            tag: "<input>",
            line: lineNumber,
            solution: 'Add name="..." in <input>',
          });
        }
        if (node.name === "input" && !node.attribs?.type) {
          issues.push({
            type: "Missing type attribute",
            tag: "<input>",
            line: lineNumber,
            solution: 'Add type="..." in <input>',
          });
        }
        if (node.name === "textarea" && !node.attribs?.name) {
          issues.push({
            type: "Missing name attribute",
            tag: "<textarea>",
            line: lineNumber,
            solution: 'Add name="..." in <textarea>',
          });
        }
        if (node.attribs?.style) {
          issues.push({
            type: "Inline style detected",
            tag: `<${node.name}>`,
            line: lineNumber,
            solution: "Move styles to external CSS file",
          });
        }
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(doc);
    return issues;
  };

  const findLineNumber = (index, content) => {
    if (index == null || index === -1) return 1;
    return content.substring(0, index).split("\n").length;
  };

  const parseCSS = (content) => {
    const issues = [];
    const ast = csstree.parse(content, {
      parseValue: true,
      parseRulePrelude: true,
      positions: true,
    });

    csstree.walk(ast, (node) => {
      if (node.type === "Declaration") {
        const value = csstree.generate(node.value);

        if (/\b0px\b/.test(value)) {
          issues.push({
            property: node.property,
            problem: "Use 0 instead of 0px",
            line: node.loc.start.line,
            solution: "Replace '0px' with '0'",
          });
        }
        if (node.property.startsWith("font-")) {
          issues.push({
            property: node.property,
            problem: "Consider using font shorthand",
            line: node.loc.start.line,
            solution: "Use full 'font: ...' shorthand",
          });
        }
        if (node.property.startsWith("background-")) {
          issues.push({
            property: node.property,
            problem: "Consider using background shorthand",
            line: node.loc.start.line,
            solution: "Use 'background: ...' shorthand",
          });
        }
        if (node.important) {
          issues.push({
            property: node.property,
            problem: "Avoid using !important unless necessary",
            line: node.loc.start.line,
            solution: "Remove '!important' if possible",
          });
        }
      }
    });

    return issues;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Icodecatcher (HTML & CSS Analyzer)
      </h1>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Paste HTML</h2>
          <Editor
            height="300px"
            language="html"
            value={htmlCode}
            onChange={(value) => setHtmlCode(value)}
            theme="vs-light"
          />
          <h2 className="text-xl font-semibold mb-2 mt-4">Paste CSS</h2>
          <Editor
            height="300px"
            language="css"
            value={cssCode}
            onChange={(value) => setCssCode(value)}
            theme="vs-light"
          />
          <button
            onClick={handleAnalyze}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Analyze
          </button>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Detected Issues</h2>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-bold mb-2">HTML Issues:</h3>
            <ul className="list-disc ml-5">
              {htmlIssues.length === 0 && <li>No HTML issues found!</li>}
              {htmlIssues.map((issue, idx) => (
                <li key={idx}>
                  Line {issue.line}:{" "}
                  <span className="text-red-600">{issue.type}</span> <br />
                  <span className="text-green-600">
                    Solution: {issue.solution}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-4 rounded shadow mt-4">
            <h3 className="font-bold mb-2">CSS Issues:</h3>
            <ul className="list-disc ml-5">
              {cssIssues.length === 0 && <li>No CSS issues found!</li>}
              {cssIssues.map((issue, idx) => (
                <li key={idx}>
                  Line {issue.line}:{" "}
                  <span className="text-red-600">{issue.problem}</span> <br />
                  <span className="text-green-600">
                    Solution: {issue.solution}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
