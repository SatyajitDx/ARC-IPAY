// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

// 1. Manual Connect Function (Button click pe chalega)
async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet (OKX or MetaMask)!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // UI Update: Connected State
        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("dot").classList.remove("animate-pulse");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";
        
        fetchBalance(); // Balance fetch karne ka function (agar tune banaya hai)
    } catch (e) {
        console.error("Connection Failed", e);
    }
}

// 2. Toggle Profile (Menu kholna ya Connect karna)
function toggleProfile() {
    if (!userAddress || userAddress === "") {
        connectWallet(); // Agar connect nahi hai toh connect prompt aayega
    } else {
        document.getElementById("profileMenu").classList.toggle("show");
    }
}

// 3. Disconnect Logic (A to Z Reset)
function disconnectWallet() {
    userAddress = "";
    signer = null;

    // 1. Dot ko wapas RED karna
    const dot = document.getElementById("dot");
    if (dot) {
        dot.classList.replace("bg-green-500", "bg-red-500");
        dot.classList.add("animate-pulse");
    }

    // 2. Label ko "Connect Wallet" karna
    const label = document.getElementById("walletLabel");
    if (label) {
        label.innerText = "Connect Wallet";
    }

    // 3. Dropdown band karna
    const menu = document.getElementById("profileMenu");
    if (menu) {
        menu.classList.remove("show");
    }

    // 4. Balance zero karna
    if(document.getElementById("usdcBal")) document.getElementById("usdcBal").innerText = "0.00";
    if(document.getElementById("inrBal")) document.getElementById("inrBal").innerText = "0.00";

    alert("Wallet Disconnected!");
}

// 4. Copy Address Logic
function copyAddr() {
    if (userAddress) {
        navigator.clipboard.writeText(userAddress);
        alert("Address Copied!");
        document.getElementById("profileMenu").classList.remove("show");
    }
}

// Bahar click karne pe menu band ho jaye
window.onclick = function(event) {
    if (!event.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu && menu.classList.contains('show')) {
            menu.classList.remove('show');
        }
    }
}
