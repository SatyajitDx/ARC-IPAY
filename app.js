const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 94.25; 

let userAddress = "", provider, signer, codeReader;

window.addEventListener('load', async () => {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) setupWallet(accounts[0]);
    }
});

// REAL-TIME INR CALCULATION
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

async function connectWallet() {
    if (!window.ethereum) return alert("Please install OKX or MetaMask!");
    try {
        await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        try {
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID }] });
        } catch (e) {
            if (e.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: 'Arc Network Testnet',
                        rpcUrls: ['https://rpc-testnet.arcnetwork.io'],
                        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, // USDC AS NATIVE
                        blockExplorerUrls: ['https://explorer-testnet.arcnetwork.io']
                    }]
                });
            }
        }
        setupWallet(accounts[0]);
    } catch (e) { console.error(e); }
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

// --- SEND LOGIC (USDC NATIVE GAS FIX) ---
async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!ethers.utils.isAddress(to) || !amt) return alert("Check Address/Amount!");

    try {
        btn.innerText = "WAITING FOR WALLET...";
        btn.disabled = true;

        // Since USDC is Native, we check the native balance for fees
        const balance = await provider.getBalance(userAddress);
        if (balance.isZero()) {
            btn.innerText = "NO USDC GAS";
            btn.disabled = false;
            return alert("You need Native USDC for gas fees!");
        }

        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        
        // Use Type 2 (EIP-1559) for better wallet recognition
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amt, 6), {
            gasLimit: 100000,
            type: 2,
            maxPriorityFeePerGas: ethers.utils.parseUnits("1.5", "gwei"),
            maxFeePerGas: ethers.utils.parseUnits("25", "gwei")
        });

        btn.innerText = "CONFIRMING...";
        await tx.wait();
        
        alert("Transaction Successful!");
        location.reload();
    } catch (e) {
        console.error(e);
        alert("Transaction Failed! Ensure your native USDC balance covers the amount + fee.");
        btn.innerText = "CONFIRM PAYMENT";
        btn.disabled = false;
    }
}

async function fetchBalance() {
    try {
        // Fetching balance as native token since USDC is native
        const bal = await provider.getBalance(userAddress);
        const f = ethers.utils.formatUnits(bal, 18); // Check if native USDC uses 18 or 6 decimals
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.error(e); }
}

// Support UI functions
function toggleProfile() { if(!userAddress) connectWallet(); else document.getElementById("profileMenu").classList.toggle("show"); }
function openSend() { if(!userAddress) return connectWallet(); document.getElementById("sendModal").classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
function disconnectWallet() { localStorage.removeItem("isWalletConnected"); location.reload(); }
