// --- ARC NETWORK CONFIG ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 94.25; 

let userAddress = "", provider, signer;

// --- INITIALIZE ON LOAD ---
window.addEventListener('load', async () => {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) setupWallet(accounts[0]);
    }
});

// --- REAL-TIME INR CALCULATION ---
function updateInrCalc() {
    const usdcVal = document.getElementById("sendAmt").value;
    const display = document.getElementById("inrCalcDisplay");
    if (usdcVal > 0) {
        const inrVal = (usdcVal * INR_RATE).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
        display.innerText = `≈ (₹${inrVal})`;
    } else {
        display.innerText = `≈ (₹0.00)`;
    }
}

// --- WALLET CORE LOGIC (MetaMask Optimized) ---
async function toggleProfile() {
    if (!userAddress) connectWallet();
    else document.getElementById("profileMenu").classList.toggle("show");
}

async function connectWallet() {
    if (!window.ethereum) return alert("Bhai, MetaMask install karo!");
    try {
        // Request MetaMask accounts
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        try {
            // Switch to Arc Network
            await window.ethereum.request({ 
                method: 'wallet_switchEthereumChain', 
                params: [{ chainId: ARC_CHAIN_ID }] 
            });
        } catch (e) {
            if (e.code === 4902) {
                // Add Arc Network if not present in MetaMask
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: 'Arc Network Testnet',
                        rpcUrls: ['https://rpc-testnet.arcnetwork.io'],
                        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                        blockExplorerUrls: ['https://explorer-testnet.arcnetwork.io']
                    }]
                });
            }
        }
        setupWallet(accounts[0]);
    } catch (e) { console.error("User cancelled", e); }
}

async function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    
    const short = addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
    document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
    document.getElementById("dot").classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = short.toUpperCase();
    
    localStorage.setItem("isWalletConnected", "true");
    fetchBalance();
}

// --- SEND LOGIC (MetaMask Instant Confirmation) ---
async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!ethers.utils.isAddress(to) || !amt || amt <= 0) return alert("Sahi details dalo bhai!");

    try {
        btn.innerText = "CONFIRMING..."; 
        btn.disabled = true;

        // MetaMask EIP-1559 Gas Estimation
        const feeData = await provider.getFeeData();

        // Native USDC Transfer
        const tx = await signer.sendTransaction({
            to: to,
            value: ethers.utils.parseUnits(amt.toString(), 18), 
            // MetaMask priority settings for instant mining
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.utils.parseUnits("2", "gwei"),
            maxFeePerGas: feeData.maxFeePerGas || ethers.utils.parseUnits("30", "gwei"),
            gasLimit: 21000 
        });
        
        console.log("Tx Hash:", tx.hash);

        // Wait for Block Confirmation
        const receipt = await tx.wait(1); 
        
        if (receipt.status === 1) {
            document.getElementById("sendModal").classList.add("hidden");
            document.getElementById("successModal").classList.remove("hidden");
        } else {
            throw new Error("Transaction Failed");
        }

    } catch (e) {
        console.error(e);
        alert("Transaction Fail ho gayi! MetaMask mein balance check karo.");
        btn.innerText = "Confirm Payment";
        btn.disabled = false;
    }
}

// --- BALANCES ---
async function fetchBalance() {
    if(!userAddress) return;
    try {
        const bal = await provider.getBalance(userAddress);
        const f = ethers.utils.formatUnits(bal, 18);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.error("Balance Load Failed", e); }
}

// --- UTILS ---
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Address Copied! ✅"); }
function disconnectWallet() { localStorage.removeItem("isWalletConnected"); location.reload(); }
function openSend() { if(!userAddress) return connectWallet(); document.getElementById("sendModal").classList.remove("hidden"); }
function openReceive() { alert("Coming Soon!"); }
function openScan() { alert("Coming Soon!"); }
function openHistory() { alert("Coming Soon!"); }

window.onclick = (e) => {
    if (!e.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu) menu.classList.remove("show");
    }
}
