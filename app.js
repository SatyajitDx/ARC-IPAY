// --- CONFIG (Rates & Addresses) ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const MERCHANT_ADDRESS = "0x7a67f9b3BB918182Ad94182aC10f80F9619be81C"; // Merchant Address Locked
const ARC_CHAIN_ID = '0x4cef52'; 
const RPC_URL = 'https://rpc.testnet.arc.network';
const EXPLORER_URL = 'https://testnet.arcscan.app';
const INR_RATE = 94.25; 

let userAddress = "", provider, signer, codeReader, currentService = "DIRECT";

// --- INITIALIZE ON LOAD ---
window.addEventListener('load', async () => {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) setupWallet(accounts[0]);
    }
});

// --- UI CONVERTER (Real-time INR calculation) ---
function updateInrCalc() {
    const val = document.getElementById("sendAmt").value;
    const display = document.getElementById("inrCalcDisplay");
    
    if (val > 0) {
        // Agar Direct Send hai toh input USDC hai, agar Billing hai toh input INR hai
        if (currentService === "DIRECT") {
            const inr = (val * INR_RATE).toLocaleString('en-IN');
            display.innerText = `≈ (₹${inr})`;
        } else {
            const usdc = (val / INR_RATE).toFixed(4);
            display.innerText = `≈ (${usdc} USDC will be deducted)`;
        }
    } else {
        display.innerText = "≈ (₹0.00)";
    }
}

// --- WALLET CORE ---
async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID }] }).catch(async (e) => {
            if (e.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID, chainName: 'Arc Testnet', rpcUrls: [RPC_URL],
                        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                        blockExplorerUrls: [EXPLORER_URL]
                    }]
                });
            }
        });
        setupWallet(accounts[0]);
    } catch (e) { console.error(e); }
}

function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
    document.getElementById("dot").classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = addr.substring(0, 6) + "..." + addr.substring(addr.length - 4).toUpperCase();
    localStorage.setItem("isWalletConnected", "true");
    fetchBalance();
}

// --- BILLING & RECHARGE LOGIC ---
function openBilling(serviceType) {
    if(!userAddress) return connectWallet();
    
    currentService = serviceType.toUpperCase();
    const modal = document.getElementById("sendModal");
    const label = modal.querySelector('label[for="sendTo"]');
    const input = document.getElementById("sendTo");
    const amtLabel = modal.querySelector('label[for="sendAmt"]');
    
    modal.classList.remove("hidden");
    modal.querySelector('h3').innerText = `${currentService} PAYMENT`;
    
    // UI changes for Billing
    if(currentService === 'MOBILE') {
        label.innerText = "Mobile Number";
        input.placeholder = "Enter 10 digit mobile number";
        input.value = ""; 
    } else {
        label.innerText = "Consumer ID / ID Number";
        input.placeholder = "Enter ID Number";
        input.value = "";
    }
    
    amtLabel.innerText = "Amount in INR (₹)";
    document.getElementById("sendAmt").placeholder = "0";
    document.getElementById("inrCalcDisplay").innerText = "≈ (0.00 USDC)";
}

function openSend() {
    if(!userAddress) return connectWallet();
    currentService = "DIRECT";
    document.getElementById("sendModal").classList.remove("hidden");
    document.getElementById("sendModal").querySelector('h3').innerText = "SEND USDC";
    document.getElementById("sendTo").placeholder = "0x...";
    document.querySelector('label[for="sendTo"]').innerText = "Recipient Address";
    document.querySelector('label[for="sendAmt"]').innerText = "Amount in USDC";
    document.getElementById("sendAmt").value = "";
}

// --- FINAL PAYMENT PROCESSOR ---
async function processSend() {
    const target = document.getElementById("sendTo").value;
    const inputVal = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!target || !inputVal) return alert("Please fill all details!");

    try {
        btn.innerText = "PREPARING..."; btn.disabled = true;

        let finalRecipient = target;
        let usdcAmount = 0;

        if (currentService === "DIRECT") {
            if(!ethers.utils.isAddress(target)) throw new Error("Invalid Wallet Address");
            usdcAmount = inputVal;
        } else {
            // Billing: Input is INR, convert to USDC
            usdcAmount = (inputVal / INR_RATE).toFixed(6);
            finalRecipient = MERCHANT_ADDRESS; // Send to Merchant
        }

        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(finalRecipient, ethers.utils.parseUnits(usdcAmount.toString(), 6));
        
        btn.innerText = "CONFIRMING...";
        await tx.wait(1);

        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("receiptModal").classList.remove("hidden");
        
        document.getElementById("recAmt").innerText = currentService === "DIRECT" ? `${usdcAmount} USDC` : `₹${inputVal}`;
        document.getElementById("recInr").innerText = currentService === "DIRECT" ? `≈ ₹${(usdcAmount * INR_RATE).toFixed(2)}` : `Service: ${currentService}`;
        document.getElementById("recTo").innerText = `Ref: ${target}`;

        btn.innerText = "Confirm Payment"; btn.disabled = false;
        fetchBalance();
    } catch (e) {
        console.error(e);
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("failModal").classList.remove("hidden");
        document.getElementById("failReason").innerText = "Transaction failed. Check balance or network.";
        btn.innerText = "Confirm Payment"; btn.disabled = false;
    }
}

// --- OTHER FEATURES ---
async function openHistory() {
    if(!userAddress) return connectWallet();
    document.getElementById("historyModal").classList.remove("hidden");
    const list = document.getElementById("txList");
    list.innerHTML = `<p class="text-[10px] text-center opacity-20">Loading...</p>`;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress, null), -500);
        list.innerHTML = logs.length === 0 ? "No Transactions" : logs.reverse().map(l => `
            <div class="bg-gray-50 p-4 rounded-2xl mb-2 border border-gray-100">
                <p class="text-[9px] font-black text-red-500">PAID</p>
                <p class="text-xs font-black italic">₹${(ethers.utils.formatUnits(l.args.value, 6) * INR_RATE).toFixed(2)}</p>
                <p class="text-[8px] truncate opacity-40">${l.args.to}</p>
            </div>`).join('');
    } catch (e) { list.innerHTML = "Error loading history."; }
}

function fetchBalance() {
    if(!userAddress) return;
    provider.getBalance(userAddress).then(bal => {
        const f = ethers.utils.formatUnits(bal, 18);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    });
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
function toggleProfile() { if(!userAddress) connectWallet(); else document.getElementById("profileMenu").classList.toggle("show"); }

window.onclick = (e) => {
    if (!e.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu && menu.classList.contains("show")) menu.classList.remove("show");
    }
}
