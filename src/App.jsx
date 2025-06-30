import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { Moon, RefreshCw, Sun } from "lucide-react";

function App() {
    const [products, setProducts] = useState([]); // Product names (headers, except first cell)
    const [selectedProducts, setSelectedProducts] = useState([]); // Selected product names
    const [ingredients, setIngredients] = useState([]); // Array of { name, values: { [product]: yes/no } }
    const [result, setResult] = useState(null); // { yes: [...], no: [...] }
    const [name, setName] = useState("");
    const [inputName, setInputName] = useState("");
    const [inputASN, setInputASN] = useState("");
    const [inputDIS, setInputDIS] = useState("");
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

    // Download as PDF using html2pdf.js
    const handleDownloadPDF = async () => {
        if (!invoiceRef.current) return;
        const filename = inputName.replace(/\s+/g, "_") || "document";
        // html2pdf options
        const opt = {
            margin: 0,
            filename: `${filename}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        };
        await html2pdf().set(opt).from(invoiceRef.current).save();
        // Reset all relevant state after download
        setName("");
        setInputName("");
        setSelectedProducts([]);
        setResult(null);
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: "smooth" });
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
                                Excel file:
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
                                disabled
                            />
                        </div>
                        <div className="flex justify-end mb-4 gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    boxShadow: "none",
                                    padding: 0,
                                    margin: 0,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                aria-label="Refresh app">
                                <RefreshCw size={26} />
                            </button>
                            <button
                                onClick={handleToggleDarkMode}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    boxShadow: "none",
                                    padding: 0,
                                    margin: 0,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                aria-label="Toggle dark mode">
                                {darkMode ? (
                                    <Sun size={26} />
                                ) : (
                                    <Moon size={26} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Only show the rest of the UI if a file is loaded */}
                {fileLoaded ? (
                    <>
                        {/* Name input always visible, welcome message beside it */}
                        <div className="mb-8 flex flex-row items-center gap-4 justify-between">
                            <form
                                className="flex gap-2 items-center"
                                onSubmit={handleNameSubmit}>
                                <label
                                    style={{
                                        color: colors.text,
                                        fontWeight: 600,
                                        fontSize: 18,
                                    }}>
                                    Name:
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
                                <label
                                    style={{
                                        color: colors.text,
                                        fontWeight: 600,
                                        fontSize: 18,
                                    }}>
                                    DIS:
                                </label>
                                <input
                                    type="text"
                                    value={inputDIS}
                                    onChange={(e) =>
                                        setInputDIS(e.target.value)
                                    }
                                    style={{
                                        background: colors.input,
                                        color: colors.inputText,
                                        border: `1px solid ${colors.inputBorder}`,
                                        borderRadius: 6,
                                        padding: "8px 14px",
                                        fontSize: 16,
                                    }}
                                    placeholder="Your DIS"
                                    required
                                />
                                <label
                                    style={{
                                        color: colors.text,
                                        fontWeight: 600,
                                        fontSize: 18,
                                    }}>
                                    ASN:
                                </label>
                                <input
                                    type="text"
                                    value={inputASN}
                                    onChange={(e) =>
                                        setInputASN(e.target.value)
                                    }
                                    style={{
                                        background: colors.input,
                                        color: colors.inputText,
                                        border: `1px solid ${colors.inputBorder}`,
                                        borderRadius: 6,
                                        padding: "8px 14px",
                                        fontSize: 16,
                                    }}
                                    placeholder="Your ASN"
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
                                            width: "210mm",
                                            minHeight: "297mm",
                                            maxWidth: "210mm",
                                            margin: "0 auto",
                                            backgroundColor: "#fff",
                                            color: "#222",
                                            fontFamily: "Arial, sans-serif",
                                            fontSize: "11pt",
                                            lineHeight: "1.2",
                                            boxSizing: "border-box",
                                            overflow: "hidden",
                                            position: "relative",
                                            display: "block",
                                            padding: "5mm",
                                        }}>
                                        {/* Page 1: Header, Selected Products, Included Ingredients */}
                                        <div
                                            style={{
                                                pageBreakAfter: "always",
                                            }}>
                                            {/* Header Section */}
                                            <div
                                                style={{
                                                    marginBottom: "8mm",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                }}>
                                                <div
                                                    style={{
                                                        fontSize: "16pt",
                                                        fontWeight: "bold",
                                                        color: "#000000",
                                                    }}>
                                                    Name: {name || inputName}
                                                </div>
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
                                            {/* Selected Products Section */}
                                            <div>
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
                                                        {inputDIS}
                                                        {selectedProducts.length >
                                                            0 && (
                                                            <span>
                                                                {" "}
                                                                (Total:{" "}
                                                                {
                                                                    selectedProducts.length
                                                                }
                                                                )
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "10pt",
                                                            lineHeight: "1.3",
                                                            color: "#000000",
                                                        }}>
                                                        {selectedProducts.join(
                                                            ", "
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Included Ingredients Section */}
                                            <div style={{ marginTop: "5mm" }}>
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
                                                    Included {inputASN}
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            marginLeft: 8,
                                                        }}>
                                                        (Total:{" "}
                                                        {result.yes.length})
                                                    </span>
                                                </div>
                                                <ul
                                                    style={{
                                                        marginLeft: 20,
                                                        padding: 0,
                                                        listStyle: "none",
                                                    }}>
                                                    {result.yes.length > 0 ? (
                                                        result.yes.map(
                                                            (
                                                                ingredient,
                                                                idx
                                                            ) => (
                                                                <li
                                                                    key={idx}
                                                                    style={{
                                                                        marginBottom: 8,
                                                                        color: "#222",
                                                                        fontSize: 15,
                                                                    }}>
                                                                    {ingredient}
                                                                </li>
                                                            )
                                                        )
                                                    ) : (
                                                        <li
                                                            style={{
                                                                color: "#888",
                                                            }}>
                                                            No approved
                                                            ingredients
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                        {/* Page 2: Excluded Ingredients Section */}
                                        <div>
                                            <div
                                                style={{
                                                    fontWeight: 600,
                                                    fontSize: "1rem",
                                                    marginBottom: 8,
                                                    marginTop: 10,
                                                    borderBottom:
                                                        "1px solid #bbb",
                                                    paddingBottom: 6,
                                                    color: "#222",
                                                }}>
                                                Excluded {inputASN}
                                            </div>
                                            <ul
                                                style={{
                                                    marginLeft: 20,
                                                    padding: 0,
                                                    listStyle: "none",
                                                }}>
                                                {result.no.length > 0 ? (
                                                    result.no.map(
                                                        (
                                                            ingredientName,
                                                            idx
                                                        ) => {
                                                            const ingredientObj =
                                                                ingredients.find(
                                                                    (i) =>
                                                                        i.name ===
                                                                        ingredientName
                                                                );
                                                            const noProducts =
                                                                selectedProducts.filter(
                                                                    (product) =>
                                                                        ingredientObj &&
                                                                        String(
                                                                            ingredientObj
                                                                                .values[
                                                                                product
                                                                            ]
                                                                        )
                                                                            .trim()
                                                                            .toLowerCase() ===
                                                                            "no"
                                                                );
                                                            return (
                                                                <li
                                                                    key={idx}
                                                                    style={{
                                                                        marginBottom: 12,
                                                                        color: "#222",
                                                                        fontSize: 15,
                                                                    }}>
                                                                    <div
                                                                        style={{
                                                                            fontWeight: 500,
                                                                        }}>
                                                                        {
                                                                            ingredientName
                                                                        }
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            fontSize: 13,
                                                                            color: "#b91c1c",
                                                                            marginLeft: 8,
                                                                        }}>
                                                                        No for:{" "}
                                                                        {noProducts.join(
                                                                            ", "
                                                                        )}
                                                                    </div>
                                                                </li>
                                                            );
                                                        }
                                                    )
                                                ) : (
                                                    <li
                                                        style={{
                                                            color: "#888",
                                                        }}>
                                                        No non-approved
                                                        ingredients
                                                    </li>
                                                )}
                                            </ul>
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
