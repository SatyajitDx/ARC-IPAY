const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN = '0x4cef52';
const INR_RATE = 83.50;
let userAddress = "", provider, signer;

async function connectWallet() {
    if (!window.ethereum) return alert("Install Wallet!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";
        fetchBalance();
    } catch (e) { console.log(e); }
}

function toggleProfile() {
    userAddress ? document.getElementById("profileMenu").classList.toggle("show") : connectWallet();
}

async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.log("Bal error"); }
}

function openSend() {
    if(!userAddress) return connectWallet();
    const to = prompt("Recipient Address:");
    const amt = prompt("Amount USDC:");
    if(to && amt) alert("Transaction Processing on Arc Network...");
}

function openReceive() {
    if(!userAddress) return connectWallet();
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("myAddr").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 150, height: 150 });
}

function startFlow(type) { alert(type.toUpperCase() + " Service Coming Soon on Arc Testnet!"); }
function disconnectWallet() { userAddress = ""; location.reload(); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
window.onclick = (e) => { if (!e.target.matches('#walletBtn, #walletBtn *')) document.getElementById("profileMenu").classList.remove("show"); }
