import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function App() {
    const [products, setProducts] = useState([]); // Product names (headers, except first cell)
    const [selectedProducts, setSelectedProducts] = useState([]); // Selected product names
    const [ingredients, setIngredients] = useState([]); // Array of { name, values: { [product]: yes/no } }
    const [result, setResult] = useState(null); // { yes: [...], no: [...] }
    const [name, setName] = useState("");
    const [inputName, setInputName] = useState("");
    const invoiceRef = useRef();

    // Load static Excel file from public folder on mount
    useEffect(() => {
        fetch("/products.xlsx")
            .then((res) => res.arrayBuffer())
            .then((ab) => {
                const wb = XLSX.read(ab, { type: "array" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1 });
                if (!sheetData.length) return;
                // First row: ['', Product_1, Product_2, ...]
                const products = sheetData[0].slice(1);
                setProducts(products);
                // Remaining rows: [Ingredient, Yes/No, Yes/No, ...]
                const ingredients = sheetData.slice(1).map((row) => ({
                    name: row[0],
                    values: products.reduce((acc, product, idx) => {
                        acc[product] = row[idx + 1];
                        return acc;
                    }, {}),
                }));
                setIngredients(ingredients);
            });
    }, []);

    // Handle checkbox change
    const handleProductCheckbox = (product) => {
        setSelectedProducts((prev) =>
            prev.includes(product)
                ? prev.filter((p) => p !== product)
                : [...prev, product]
        );
        setResult(null); // Reset result on change
    };

    // Show button if at least one product is selected
    const showCheckButton = selectedProducts.length > 0;

    // Handle button click
    const handleCheckIngredients = () => {
        const yes = [];
        const no = [];
        ingredients.forEach((ingredient) => {
            const allYes = selectedProducts.every(
                (product) =>
                    String(ingredient.values[product]).trim().toLowerCase() ===
                    "yes"
            );
            if (allYes) {
                yes.push(ingredient.name);
            } else {
                no.push(ingredient.name);
            }
        });
        setResult({ yes, no });
    };

    // Handle name input submit
    const handleNameSubmit = (e) => {
        e.preventDefault();
        setName(inputName.trim());
    };

    // Download as PDF using jsPDF + html2canvas
    const handleDownloadPDF = async () => {
        if (!invoiceRef.current) return;
        const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "px",
            format: "a4",
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 40; // 20px margin each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
        
        const filename = inputName.replace(" ", "_");
        pdf.save(`${filename}.pdf`);
    };

    // Get today's date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    // Utility function to split an array into N columns
    function splitIntoColumns(arr, columns) {
        const itemsPerColumn = Math.ceil(arr.length / columns);
        const result = [];
        for (let i = 0; i < columns; i++) {
            result.push(
                arr.slice(i * itemsPerColumn, (i + 1) * itemsPerColumn)
            );
        }
        return result;
    }

    const yesColumns = result ? splitIntoColumns(result.yes, 2) : [[], []];
    const noColumns = result ? splitIntoColumns(result.no, 2) : [[], []];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-2 px-2">
            <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg p-8">
                {/* Name input always visible, welcome message beside it */}
                <div className="mb-8 flex flex-row items-center gap-4 justify-between">
                    <div className="flex gap-2 items-center">
                        <label className="text-lg font-semibold text-gray-700">
                            Enter your name:
                        </label>
                        <input
                            type="text"
                            value={inputName}
                            onChange={(e) => setInputName(e.target.value)}
                            className="border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
                            placeholder="Your name"
                            required
                        />
                        <button
                            type="button"
                            onClick={handleNameSubmit}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition">
                            Submit
                        </button>
                    </div>
                    {name && (
                        <span className="ml-4 text-xl font-bold text-blue-700">
                            Welcome, {name}!
                        </span>
                    )}
                </div>
                <hr className="mb-5 opacity-20"/>
                <h2 className="text-3xl text-center font-bold text-gray-700 mb-5">
                    Products
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 justify-center mb-6">
                    {products.map((product, idx) => (
                        <label
                            key={idx}
                            className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer min-w-0"
                            style={{ minHeight: 44 }}
                        >
                            <input
                                type="checkbox"
                                className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                checked={selectedProducts.includes(product)}
                                onChange={() => handleProductCheckbox(product)}
                            />
                            <span className="truncate text-gray-800 font-medium text-sm">
                                {product}
                            </span>
                        </label>
                    ))}
                </div>
                {showCheckButton && (
                    <button
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg shadow mb-6 transition"
                        onClick={handleCheckIngredients}>
                        Check Ingredients
                    </button>
                )}
                {result && (
                    <>
                        <div className="mt-8 flex flex-col items-center">
                            <button
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg shadow mb-6 transition"
                                onClick={handleDownloadPDF}
                                type="button">
                                Download as PDF
                            </button>
                        </div>
                        {/* Professional Invoice-style template optimized for single-page PDF - Black & White */}
                        <div
                            ref={invoiceRef}
                            style={{
                                width: "210mm", // A4 width
                                minHeight: "306mm", // A4 height
                                maxHeight: "306mm",
                                margin: "0 auto",
                                // padding: "8mm",
                                backgroundColor: "#ffffff",
                                color: "#000000",
                                fontFamily: "Arial, sans-serif",
                                fontSize: "11pt",
                                lineHeight: "1.2",
                                boxSizing: "border-box",
                                // border: "2px solid #000000",
                                overflow: "hidden",
                                position: "relative",
                                pageBreakInside: "avoid",
                                display: "block",
                            }}>
                            {/* Header Section - Compact */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "3mm",
                                    paddingBottom: "3mm",
                                    borderBottom: "1px solid #000000",
                                }}>
                                <div
                                    style={{
                                        fontSize: "16pt",
                                        fontWeight: "bold",
                                        color: "#000000",
                                    }}>
                                    Name: {name || inputName}
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div
                                        style={{
                                            fontSize: "12pt",
                                            fontWeight: "bold",
                                            marginBottom: "1mm",
                                            color: "#000000",
                                        }}>
                                        Date: {dateStr}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "10pt",
                                            color: "#000000",
                                        }}>
                                        Time: {timeStr}
                                    </div>
                                </div>
                            </div>

                            {/* Selected Products Section - Compact */}
                            <div
                                style={{
                                    marginBottom: "3mm",
                                    paddingBottom: "3mm",
                                    borderBottom: "1px solid #000000",
                                }}>
                                <div
                                    style={{
                                        fontSize: "11pt",
                                        fontWeight: "bold",
                                        marginBottom: "1mm",
                                        color: "#000000",
                                    }}>
                                    Selected Products:
                                </div>
                                <div
                                    style={{
                                        fontSize: "10pt",
                                        lineHeight: "1.3",
                                        color: "#000000",
                                    }}>
                                    {selectedProducts.join(", ")}
                                </div>
                            </div>

                            {/* Content Section - More compact */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: "10mm",
                                    height: "200mm", // Fixed height for content area
                                    marginTop: "5mm",
                                }}>
                                {/* Yes Ingredients Column */}
                                <div
                                    style={{
                                        flex: "1",
                                        minWidth: "0",
                                    }}>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: "1rem",
                                            marginBottom: 8,
                                            borderBottom: "1px solid #bbb",
                                            paddingBottom: 6,
                                            color: "#222",
                                        }}>
                                        Yes Ingredients
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "4mm",
                                            height: "180mm",
                                            overflow: "hidden",
                                        }}>
                                        {yesColumns.map((column, colIdx) => (
                                            <div
                                                key={colIdx}
                                                style={{
                                                    flex: 1,
                                                    overflow: "hidden",
                                                }}>
                                                {column.length > 0
                                                    ? column.map(
                                                          (ingredient, idx) => (
                                                              <div
                                                                  key={idx}
                                                                  style={{
                                                                    padding:
                                                                          "3px 0",
                                                                      fontSize:
                                                                          "11pt",
                                                                      wordBreak:
                                                                          "break-word",
                                                                      color: "#000000",
                                                                  }}>
                                                                  {ingredient}
                                                              </div>
                                                          )
                                                      )
                                                    : colIdx === 0 && (
                                                          <div
                                                              style={{
                                                                  fontStyle:
                                                                      "italic",
                                                                  color: "#666666",
                                                                  textAlign:
                                                                      "center",
                                                                  padding:
                                                                      "15mm 0",
                                                                  fontSize:
                                                                      "9pt",
                                                              }}>
                                                              No approved
                                                              ingredients
                                                          </div>
                                                      )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* No Ingredients Column */}
                                <div className="flex-1">
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: "1rem",
                                            marginBottom: 8,
                                            borderBottom: "1px solid #bbb",
                                            paddingBottom: 6,
                                            color: "#222",
                                        }}>
                                        No Ingredients
                                    </div>
                                    <div style={{ display: "flex", gap: 16 }}>
                                        {[0, 1].map((col) => (
                                            <ul
                                                key={col}
                                                style={{
                                                    marginLeft: 20,
                                                    flex: 1,
                                                }}>
                                                {noColumns[col].length > 0
                                                    ? noColumns[col].map(
                                                          (ingredient, idx) => (
                                                              <div
                                                                  key={idx}
                                                                  style={{
                                                                      padding:
                                                                          "3px 0",
                                                                      fontSize:
                                                                          "11pt",
                                                                      wordBreak:
                                                                          "break-word",
                                                                      color: "#000000",
                                                                  }}>
                                                                  {ingredient}
                                                              </div>
                                                          )
                                                      )
                                                    : col === 0 &&
                                                      result.no.length ===
                                                          0 && (
                                                          <li
                                                              style={{
                                                                  color: "#888",
                                                              }}>
                                                              No non-approved
                                                              ingredients
                                                          </li>
                                                      )}
                                            </ul>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default App;
