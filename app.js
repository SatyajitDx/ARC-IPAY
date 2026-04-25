// --- CONFIG ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

// 1. Connection Logic
async function connectWallet() {
    if (!window.ethereum) return alert("Please install OKX or MetaMask!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // UI Update
        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("dot").classList.remove("animate-pulse");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 8) + "...";
        
        // Balance fetch (optional logic yahan dal sakte ho)
        document.getElementById("usdcBal").innerText = "135.85"; // Mock balance for demo
        document.getElementById("inrBal").innerText = (135.85 * INR_RATE).toLocaleString('en-IN');
        
    } catch (e) { console.log(e); }
}

// 2. Profile/Connect Toggle
function toggleProfile() {
    if (!userAddress || userAddress === "") {
        connectWallet();
    } else {
        document.getElementById("profileMenu").classList.toggle("show");
    }
}

// 3. Disconnect Logic
function disconnectWallet() {
    userAddress = "";
    signer = null;

    // Reset UI
    const dot = document.getElementById("dot");
    dot.classList.replace("bg-green-500", "bg-red-500");
    dot.classList.add("animate-pulse");

    document.getElementById("walletLabel").innerText = "Connect Wallet";
    document.getElementById("profileMenu").classList.remove("show");
    
    document.getElementById("usdcBal").innerText = "0.00";
    document.getElementById("inrBal").innerText = "0.00";

    alert("Disconnected!");
}

// 4. Copy Logic
function copyAddr() {
    navigator.clipboard.writeText(userAddress);
    alert("Copied!");
    document.getElementById("profileMenu").classList.remove("show");
}

// Close dropdown on click outside
window.onclick = function(event) {
    if (!event.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu && menu.classList.contains('show')) menu.classList.remove('show');
    }
}
