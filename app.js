const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 94.25; 

let userAddress = "", provider, signer;

window.addEventListener('load', async () => {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) setupWallet(accounts[0]);
    }
});

function updateInrCalc() {
    const val = document.getElementById("sendAmt").value;
    const disp = document.getElementById("inrCalcDisplay");
    disp.innerText = val > 0 ? `≈ (₹${(val * INR_RATE).toLocaleString('en-IN', {minimumFractionDigits:2})})` : `≈ (₹0.00)`;
}

async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask/OKX!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        try {
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID }] });
        } catch (e) {
            if (e.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID, chainName: 'Arc Network Testnet',
                        rpcUrls: ['https://rpc-testnet.arcnetwork.io'],
                        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }
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
    document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
    document.getElementById("dot").classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = addr.substring(0, 6) + "..." + addr.substring(addr.length - 4).toUpperCase();
    localStorage.setItem("isWalletConnected", "true");
    fetchBalance();
}

async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!ethers.utils.isAddress(to) || !amt) return alert("Details bharo!");

    try {
        btn.innerText = "CONFIRMING..."; btn.disabled = true;
        const tx = await signer.sendTransaction({
            to: to, value: ethers.utils.parseUnits(amt, 18), gasLimit: 100000 
        });
        await tx.wait(1); 
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("successModal").classList.remove("hidden");
    } catch (e) {
        alert("Failed!");
        btn.innerText = "Confirm Payment"; btn.disabled = false;
    }
}

async function fetchBalance() {
    try {
        const bal = await provider.getBalance(userAddress);
        const f = ethers.utils.formatUnits(bal, 18);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.error(e); }
}

function toggleProfile() { if(!userAddress) connectWallet(); else document.getElementById("profileMenu").classList.toggle("show"); }
function openSend() { if(!userAddress) return connectWallet(); document.getElementById("sendModal").classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
function disconnectWallet() { localStorage.removeItem("isWalletConnected"); location.reload(); }

// Simple alerts for unconfigured buttons
function openReceive() { alert("Receive QR coming soon..."); }
function openScan() { alert("Scanner coming soon..."); }
function openHistory() { alert("History coming soon..."); }
