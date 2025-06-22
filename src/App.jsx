import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Moon, Sun } from "lucide-react";

function App() {
    const [products, setProducts] = useState([]); // Product names (headers, except first cell)
    const [selectedProducts, setSelectedProducts] = useState([]); // Selected product names
    const [ingredients, setIngredients] = useState([]); // Array of { name, values: { [product]: yes/no } }
    const [result, setResult] = useState(null); // { yes: [...], no: [...] }
    const [name, setName] = useState("");
    const [inputName, setInputName] = useState("");
    const [fileLoaded, setFileLoaded] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const invoiceRef = useRef();

    // Handle file upload and parse Excel
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = evt.target.result;
            const wb = XLSX.read(data, { type: "binary" });
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
            setFileLoaded(true);
            setSelectedProducts([]);
            setResult(null);
        };
        reader.readAsBinaryString(file);
    };

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
        const canvas = await html2canvas(invoiceRef.current, { scale: 1 });
        const imgData = canvas.toDataURL("image/jpeg", 0.7);
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "px",
            format: "a4",
        });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "JPEG", 20, 20, imgWidth, imgHeight, undefined, 'FAST');
        const filename = inputName.replace(" ", "_");
        pdf.save(`${filename}.pdf`);
        // Reset all relevant state after download
        setName("");
        setInputName("");
        setSelectedProducts([]);
        setResult(null);
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Toggle dark mode
    const handleToggleDarkMode = () => setDarkMode((prev) => !prev);

    // Define color schemes
    const lightColors = {
        bg: "#f8fafc",
        card: "#fff",
        text: "#222",
        border: "#e5e7eb",
        input: "#fff",
        inputText: "#222",
        inputBorder: "#d1d5db",
        button: "#2563eb",
        buttonText: "#fff",
        buttonHover: "#1d4ed8",
        shadow: "0 1px 4px rgba(0,0,0,0.04)",
    };
    const darkColors = {
        bg: "#18181b",
        card: "#23232a",
        text: "#f4f4f5",
        border: "#1e1e1e",
        input: "#23232a",
        inputText: "#f4f4f5",
        inputBorder: "#444",
        button: "#0ea5e9",
        buttonText: "#fff",
        buttonHover: "#0369a1",
        shadow: "0 1px 4px rgba(0,0,0,0.18)",
    };
    const colors = darkMode ? darkColors : lightColors;

    // Sort products alphabetically for display
    const sortedProducts = [...products].sort((a, b) => a.localeCompare(b));

    return (
        <div
            style={{
                minHeight: "100vh",
                background: colors.bg,
                color: colors.text,
                transition: "background 0.3s, color 0.3s",
            }}
            className="flex flex-col items-center justify-start py-2 px-1 sm:px-2 select-none">
            <div
                style={{
                    background: colors.card,
                    color: colors.text,
                    boxShadow: colors.shadow,
                    borderRadius: 16,
                    width: "100%",
                    maxWidth: 1400,
                    padding: "1rem 2rem 2rem 2rem",
                    margin: "0 auto",
                    border: `1px solid ${colors.border}`,
                    transition: "background 0.3s, color 0.3s",
                }}>
                {/* File input for Excel upload */}
                <div className="mb-6 flex flex-row items-center gap-4 justify-between">
                    <div className="flex gap-2 items-center justify-between w-full">
                        <div className="flex gap-2 items-center">
                            <label
                                style={{
                                    color: colors.text,
                                    fontWeight: 600,
                                    fontSize: 18,
                                }}>
                                Upload Excel file:
                            </label>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                style={{
                                    background: colors.input,
                                    color: colors.inputText,
                                    border: `1px solid ${colors.inputBorder}`,
                                    borderRadius: 6,
                                    padding: "8px 14px",
                                    fontSize: 16,
                                }}
                            />
                        </div>
                        <button
                            onClick={handleToggleDarkMode}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                boxShadow: 'none',
                                padding: 0,
                                margin: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? <Sun color="#fff" size={28} /> : <Moon color="#222" size={28} />}
                        </button>
                    </div>
                </div>
                {/* Only show the rest of the UI if a file is loaded */}
                {fileLoaded ? (
                    <>
                        {/* Name input always visible, welcome message beside it */}
                        <div className="mb-8 flex flex-row items-center gap-4 justify-between">
                            <form className="flex gap-2 items-center" onSubmit={handleNameSubmit}>
                                <label
                                    style={{
                                        color: colors.text,
                                        fontWeight: 600,
                                        fontSize: 18,
                                    }}>
                                    Enter your name:
                                </label>
                                <input
                                    type="text"
                                    value={inputName}
                                    onChange={(e) =>
                                        setInputName(e.target.value)
                                    }
                                    style={{
                                        background: colors.input,
                                        color: colors.inputText,
                                        border: `1px solid ${colors.inputBorder}`,
                                        borderRadius: 6,
                                        padding: "8px 14px",
                                        fontSize: 16,
                                    }}
                                    placeholder="Your name"
                                    required
                                />
                                <button
                                    type="submit"
                                    style={{
                                        background: colors.button,
                                        color: colors.buttonText,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: 8,
                                        padding: "8px 18px",
                                        fontWeight: 600,
                                        fontSize: 15,
                                        boxShadow: colors.shadow,
                                        cursor: "pointer",
                                        transition:
                                            "background 0.2s, color 0.2s",
                                    }}
                                    onMouseOver={(e) =>
                                        (e.currentTarget.style.background =
                                            colors.buttonHover)
                                    }
                                    onMouseOut={(e) =>
                                        (e.currentTarget.style.background =
                                            colors.button)
                                    }>
                                    Submit
                                </button>
                            </form>
                            {name && (
                                <span
                                    style={{
                                        color: colors.button,
                                        fontWeight: 700,
                                        fontSize: 22,
                                    }}>
                                    Welcome, {name}!
                                </span>
                            )}
                        </div>
                        <hr
                            className={`mb-5 ${
                                darkMode
                                    ? "text-white opacity-20"
                                    : "opacity-20 "
                            }`}
                        />
                        <h2
                            style={{
                                color: colors.text,
                                fontWeight: 700,
                                fontSize: 28,
                                textAlign: "center",
                                marginBottom: 20,
                            }}>
                            Products
                        </h2>
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 justify-center mb-6">
                            {sortedProducts.map((product, idx) => {
                                const isChecked =
                                    selectedProducts.includes(product);
                                return (
                                    <label
                                        key={idx}
                                        className={[
                                            "flex items-center gap-2 cursor-pointer min-h-[50px] px-4 py-3 transition-all duration-200 font-medium text-[15px]",
                                            "rounded-sm box-border shadow-sm",
                                            isChecked
                                                ? "bg-lime-200 border-l-5 border-lime-500 text-gray-900"
                                                : darkMode
                                                ? "bg-[#18181b] border-l-5 border-lime-400 text-gray-100 hover:bg-lime-100/10 hover:text-lime-200"
                                                : "bg-white border-l-5 border-lime-500 text-gray-800 hover:bg-lime-100/60 hover:text-lime-700",
                                            "hover:scale-[1.010]",
                                        ].join(" ")}>
                                        <input
                                            type="checkbox"
                                            className={[
                                                "w-6 h-6 rounded focus transition-all duration-200",
                                                isChecked
                                                    ? "accent-lime-400 border-lime-500 bg-lime-300"
                                                    : darkMode
                                                    ? "accent-lime-400 border-lime-400 bg-gray-900"
                                                    : "accent-lime-500 border-lime-500 bg-white",
                                            ].join(" ")}
                                            checked={isChecked}
                                            onChange={() =>
                                                handleProductCheckbox(product)
                                            }
                                        />
                                        <span className="truncate text-[15px]">
                                            {product}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        {showCheckButton && (
                            <button
                                style={{
                                    background: colors.button,
                                    color: colors.buttonText,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 8,
                                    padding: "10px 24px",
                                    fontWeight: 600,
                                    fontSize: 16,
                                    boxShadow: colors.shadow,
                                    cursor: "pointer",
                                    marginBottom: 24,
                                    transition: "background 0.2s, color 0.2s",
                                }}
                                onClick={handleCheckIngredients}
                                onMouseOver={(e) =>
                                    (e.currentTarget.style.background =
                                        colors.buttonHover)
                                }
                                onMouseOut={(e) =>
                                    (e.currentTarget.style.background =
                                        colors.button)
                                }>
                                Check Ingredients
                            </button>
                        )}
                        {result && (
                            <>
                                <div className="mt-8 flex flex-col items-center">
                                    <button
                                        style={{
                                            background: colors.button,
                                            color: colors.buttonText,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: 8,
                                            padding: "10px 24px",
                                            fontWeight: 600,
                                            fontSize: 16,
                                            boxShadow: colors.shadow,
                                            cursor: "pointer",
                                            marginBottom: 24,
                                            transition:
                                                "background 0.2s, color 0.2s",
                                        }}
                                        onClick={handleDownloadPDF}
                                        type="button"
                                        onMouseOver={(e) =>
                                            (e.currentTarget.style.background =
                                                colors.buttonHover)
                                        }
                                        onMouseOut={(e) =>
                                            (e.currentTarget.style.background =
                                                colors.button)
                                        }>
                                        Download as PDF
                                    </button>
                                </div>
                                {/* Professional Invoice-style template optimized for single-page PDF - Black & White or Dark */}
                                <div className="p-4 bg-white w-4xl mx-auto rounded-md"> 
                                    <div
                                        ref={invoiceRef}
                                        style={{
                                            width: "210mm", // A4 width
                                            minHeight: "306mm", // A4 height
                                            maxHeight: "306mm",
                                            margin: "0 auto",
                                            backgroundColor: "#ffffff",
                                            color: "#000000",
                                            fontFamily: "Arial, sans-serif",
                                            fontSize: "11pt",
                                            lineHeight: "1.2",
                                            boxSizing: "border-box",
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
                                                borderBottom:
                                                    "1px solid #000000",
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
                                                borderBottom:
                                                    "1px solid #000000",
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
                                                        borderBottom:
                                                            "1px solid #bbb",
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
                                                    {yesColumns.map(
                                                        (column, colIdx) => (
                                                            <div
                                                                key={colIdx}
                                                                style={{
                                                                    flex: 1,
                                                                    overflow:
                                                                        "hidden",
                                                                }}>
                                                                {column.length >
                                                                0
                                                                    ? column.map(
                                                                          (
                                                                              ingredient,
                                                                              idx
                                                                          ) => (
                                                                              <div
                                                                                  key={
                                                                                      idx
                                                                                  }
                                                                                  style={{
                                                                                      padding:
                                                                                          "3px 0",
                                                                                      fontSize:
                                                                                          "11pt",
                                                                                      wordBreak:
                                                                                          "break-word",
                                                                                      color: "#000000",
                                                                                  }}>
                                                                                  {
                                                                                      ingredient
                                                                                  }
                                                                              </div>
                                                                          )
                                                                      )
                                                                    : colIdx ===
                                                                          0 && (
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
                                                                              No
                                                                              approved
                                                                              ingredients
                                                                          </div>
                                                                      )}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {/* No Ingredients Column */}
                                            <div className="flex-1">
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        fontSize: "1rem",
                                                        marginBottom: 8,
                                                        borderBottom:
                                                            "1px solid #bbb",
                                                        paddingBottom: 6,
                                                        color: "#222",
                                                    }}>
                                                    No Ingredients
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 16,
                                                    }}>
                                                    {[0, 1].map((col) => (
                                                        <ul
                                                            key={col}
                                                            style={{
                                                                marginLeft: 20,
                                                                flex: 1,
                                                            }}>
                                                            {noColumns[col]
                                                                .length > 0
                                                                ? noColumns[
                                                                      col
                                                                  ].map(
                                                                      (
                                                                          ingredient,
                                                                          idx
                                                                      ) => (
                                                                          <div
                                                                              key={
                                                                                  idx
                                                                              }
                                                                              style={{
                                                                                  padding:
                                                                                      "3px 0",
                                                                                  fontSize:
                                                                                      "11pt",
                                                                                  wordBreak:
                                                                                      "break-word",
                                                                                  color: "#000000",
                                                                              }}>
                                                                              {
                                                                                  ingredient
                                                                              }
                                                                          </div>
                                                                      )
                                                                  )
                                                                : col === 0 &&
                                                                  result.no
                                                                      .length ===
                                                                      0 && (
                                                                      <li
                                                                          style={{
                                                                              color: "#888",
                                                                          }}>
                                                                          No
                                                                          non-approved
                                                                          ingredients
                                                                      </li>
                                                                  )}
                                                        </ul>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div
                        style={{
                            color: colors.text,
                            textAlign: "center",
                            fontSize: 20,
                            marginTop: 48,
                        }}>
                        Please upload an Excel file to get started.
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
