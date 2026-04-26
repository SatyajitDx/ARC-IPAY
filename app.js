// --- ARC NETWORK CONFIG ---
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
    if (!window.ethereum) return alert("Bhai, MetaMask install karo!");
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

// --- SEND LOGIC (META-FIXED) ---
async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!ethers.utils.isAddress(to) || !amt) return alert("Sahi details dalo!");

    try {
        btn.innerText = "CONFIRMING..."; 
        btn.disabled = true;

        // SMART CONTRACT LOGIC (As seen in your successful screenshot)
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        // 18 Decimals for Arc USDC
        const amountUnits = ethers.utils.parseUnits(amt.toString(), 18);

        const tx = await contract.transfer(to, amountUnits, {
            gasLimit: 100000 // Higher limit for contract interaction
        });
        
        await tx.wait(1); 
        
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("successModal").classList.remove("hidden");

    } catch (e) {
        console.error(e);
        alert("Transaction Failed! Balance check karein.");
        btn.innerText = "Confirm Payment";
        btn.disabled = false;
    }
}

async function fetchBalance() {
    try {
        // Checking balance via contract to be safe
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 18);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.error(e); }
}

function toggleProfile() { if(!userAddress) connectWallet(); else document.getElementById("profileMenu").classList.toggle("show"); }
function openSend() { if(!userAddress) return connectWallet(); document.getElementById("sendModal").classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied! ✅"); }
function disconnectWallet() { localStorage.removeItem("isWalletConnected"); location.reload(); }
function openReceive() { alert("Coming Soon!"); }
function openScan() { alert("Coming Soon!"); }
function openHistory() { alert("Coming Soon!"); }
