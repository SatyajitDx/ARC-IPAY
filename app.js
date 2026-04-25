// --- ARC NETWORK CONFIG ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; // Testnet USDC
const ARC_CHAIN_ID = '0x4cef52'; // Arc Testnet Hex ID
const MERCHANT_ADDR = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

// 1. CONNECT WALLET
async function connectWallet() {
    if (!window.ethereum) return alert("Install OKX or MetaMask!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Auto-switch to Arc Network
        const { chainId } = await provider.getNetwork();
        if (ethers.utils.hexValue(chainId) !== ARC_CHAIN_ID) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        }

        updateUI(true);
        fetchBalance();
    } catch (e) { console.error(e); }
}

// 2. SEND (Real Transaction)
async function openSend() {
    if (!userAddress) return connectWallet();
    const to = prompt("Enter Recipient Address (0x...):");
    const amt = prompt("Enter Amount in USDC:");
    
    if (to && amt) {
        try {
            const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
            const tx = await contract.transfer(to, ethers.utils.parseUnits(amt, 6));
            alert("Transaction Sent! Hash: " + tx.hash);
            await tx.wait();
            alert("Payment Successful!");
            fetchBalance();
        } catch (e) { alert("Transaction Failed!"); }
    }
}

// 3. RECEIVE (QR Code)
function openReceive() {
    if (!userAddress) return connectWallet();
    // Modal dikhane ka logic yahan aayega
    alert("Your Arc Wallet: " + userAddress);
}

// 4. HISTORY (Real Tx Logs)
async function openHistory() {
    if (!userAddress) return connectWallet();
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
        const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -1000, "latest");
        console.log("Recent Transactions:", logs);
        alert("Check Console for Real-Time Tx History!");
    } catch (e) { console.error(e); }
}

// 5. FETCH BALANCE
async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const fBal = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(fBal).toFixed(2);
        document.getElementById("inrBal").innerText = (fBal * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.log("Balance Error"); }
}

// --- UI HELPERS ---
function toggleProfile() {
    userAddress ? document.getElementById("profileMenu").classList.toggle("show") : connectWallet();
}

function updateUI(connected) {
    const dot = document.getElementById("dot");
    const label = document.getElementById("walletLabel");
    if (connected) {
        dot.classList.replace("bg-red-500", "bg-green-500");
        label.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
    } else {
        dot.classList.replace("bg-green-500", "bg-red-500");
        label.innerText = "Connect Wallet";
    }
}

function disconnectWallet() {
    userAddress = ""; signer = null;
    updateUI(false);
    location.reload();
}
