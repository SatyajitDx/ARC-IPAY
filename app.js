const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

// --- 1. PAGE LOAD LOGIC ---
async function autoConnect() {
    // Sirf check karega ki pehle se permission hai ya nahi
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        try {
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0) {
                setupWallet(accounts[0]);
            }
        } catch (e) { console.error("Silent connect failed", e); }
    }
}

// --- 2. THE "REAL" CONNECT LOGIC (Permissions Prompt) ---
async function connectWallet() {
    if (!window.ethereum) return alert("Bhai, Web3 Wallet (MetaMask/OKX) install karo!");

    try {
        // Step A: Force wallet to show Account Selection / Wallet Picker
        await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
        });

        // Step B: Get the selected account
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Step C: Auto-Switch Network to Arc Testnet
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
        console.error("User cancelled or Error", e);
    }
}

// --- 3. UI SETUP ---
async function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    // Address formatting (Start 4 + End 4)
    const displayAddr = addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
    
    document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
    document.getElementById("dot").classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = displayAddr.toUpperCase();

    localStorage.setItem("isWalletConnected", "true");
    fetchBalance();
}

// --- 4. DISCONNECT (Clean Wipe) ---
function disconnectWallet() {
    userAddress = "";
    localStorage.removeItem("isWalletConnected");
    
    // UI Reset
    document.getElementById("dot").classList.replace("bg-green-500", "bg-red-500");
    document.getElementById("dot").classList.add("animate-pulse");
    document.getElementById("walletLabel").innerText = "CONNECT WALLET";
    
    location.reload(); // Hard refresh to clear memory
}

// --- 5. DATA FETCH ---
async function fetchBalance() {
    if(!userAddress) return;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.log("Balance error"); }
}

function toggleProfile() {
    if (!userAddress) connectWallet();
    else document.getElementById("profileMenu").classList.toggle("show");
}

window.onclick = (e) => {
    if (!e.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu) menu.classList.remove("show");
    }
}
