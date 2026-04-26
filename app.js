const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

// 1. AUTO-CONNECT (Page reload hone par)
async function autoConnect() {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        try {
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0) {
                setupWallet(accounts[0]);
            }
        } catch (e) { console.error(e); }
    }
}

// 2. SETUP WALLET (UI Format updated)
async function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    // Address Formatting: 0x12...5678 (Last 4 digits)
    const shortAddr = addr.substring(0, 4) + "..." + addr.substring(addr.length - 4);
    
    document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
    document.getElementById("dot").classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = shortAddr;

    fetchBalance();
    getTxLogs();
    localStorage.setItem("isWalletConnected", "true");
}

// 3. MANUAL CONNECT (Isse New Wallet Choose karne ka option aayega)
async function connectWallet() {
    if (!window.ethereum) return alert("MetaMask install karo!");

    try {
        // Force MetaMask to show account selection
        const accounts = await window.ethereum.request({ 
            method: "eth_requestAccounts" 
        });

        // Network Switch Logic
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        } catch (err) {
            if (err.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: 'Arc Network Testnet',
                        rpcUrls: ['https://rpc-testnet.arcnetwork.io'],
                        nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
                        blockExplorerUrls: ['https://explorer-testnet.arcnetwork.io']
                    }]
                });
            }
        }

        setupWallet(accounts[0]);

    } catch (e) {
        console.error("Connection Failed", e);
    }
}

// 4. DISCONNECT (Isse storage clear hogi taaki naya wallet connect ho sake)
function disconnectWallet() {
    userAddress = "";
    localStorage.removeItem("isWalletConnected");
    
    // UI Reset
    document.getElementById("dot").classList.replace("bg-green-500", "bg-red-500");
    document.getElementById("dot").classList.add("animate-pulse");
    document.getElementById("walletLabel").innerText = "Connect Wallet";
    
    alert("Disconnected! Ab naya wallet connect kar sakte ho.");
    location.reload(); 
}

// --- BAKI FUNCTIONS (Wahi rahenge) ---
async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) {}
}

function toggleProfile() {
    if (!userAddress) connectWallet();
    else document.getElementById("profileMenu").classList.toggle("show");
}

function copyAddr() {
    navigator.clipboard.writeText(userAddress);
    alert("Address Copied!");
}

window.onclick = (e) => {
    if (!e.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu) menu.classList.remove("show");
    }
}
