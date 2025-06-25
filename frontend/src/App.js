import React, { useState } from "react";
import { parseDocument } from "htmlparser2";
import * as csstree from "css-tree";

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

  // HTML Analysis
  const parseHTML = (content) => {
    const doc = parseDocument(content);
    const issues = [];
    const lines = content.split("\n");

    const traverse = (node, parentIndex = 0) => {
      if (!node) return;

      let index = node.startIndex || parentIndex;

      if (node.type === "tag") {
        if (node.name === "img" && !node.attribs?.alt) {
          issues.push({
            type: "Missing alt attribute",
            tag: "<img>",
            line: findLineNumber(index, content),
            solution: 'Add alt="..." attribute in <img>',
          });
        }
        if (node.name === "html" && !node.attribs?.lang) {
          issues.push({
            type: "Missing lang attribute",
            tag: "<html>",
            line: findLineNumber(index, content),
            solution: 'Add lang="en" in <html>',
          });
        }
        if (node.name === "a" && !node.attribs?.href) {
          issues.push({
            type: "Missing href in anchor tag",
            tag: "<a>",
            line: findLineNumber(index, content),
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
            line: findLineNumber(index, content),
            solution: 'Add htmlFor="..." in <label>',
          });
        }
      }

      if (node.children) {
        node.children.forEach((child) =>
          traverse(child, node.startIndex || parentIndex)
        );
      }
    };

    traverse(doc);
    return issues;
  };

  // Simple function to estimate line number based on char position
  const findLineNumber = (index, content) => {
    if (index == null) return "Unknown";
    const lines = content.substring(0, index).split("\n");
    return lines.length;
  };

  // CSS Analysis
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

        if (value.includes("0px")) {
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
          <textarea
            className="w-full h-64 p-2 border rounded"
            value={htmlCode}
            onChange={(e) => setHtmlCode(e.target.value)}
            placeholder="<html>...</html>"
          />
          <h2 className="text-xl font-semibold mb-2 mt-4">Paste CSS</h2>
          <textarea
            className="w-full h-64 p-2 border rounded"
            value={cssCode}
            onChange={(e) => setCssCode(e.target.value)}
            placeholder="body { ... }"
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
                  <span className="text-red-600">
                    {issue.type} / {issue.problem}
                  </span>{" "}
                  <br />
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
                  <span className="text-red-600">
                    {issue.type} / {issue.problem}
                  </span>{" "}
                  <br />
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
