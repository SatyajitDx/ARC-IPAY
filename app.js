const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; // Arc Testnet Chain ID
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

// 1. MAIN ACTION: Decide Connect or Show Menu
async function toggleProfile() {
    if (!userAddress || userAddress === "") {
        autoConnect(); // Agar khali hai to connect karo
    } else {
        document.getElementById("profileMenu").classList.toggle("show"); // Connected hai to menu dikhao
    }
}

// 2. CONNECT + AUTO SWITCH TO ARC NETWORK
async function autoConnect() {
    if (!window.ethereum) return alert("Bhai, MetaMask ya OKX install karlo!");

    try {
        // --- AUTO SWITCH NETWORK LOGIC ---
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
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

        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // UI Updates (Green Dot & Address)
        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("dot").classList.remove("animate-pulse");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";

        fetchBalance();
        getTxLogs();
    } catch (e) { console.error("Connection Failed", e); }
}

// 3. DISCONNECT LOGIC (Full Reset)
function disconnectWallet() {
    userAddress = "";
    
    // UI Reset
    const dot = document.getElementById("dot");
    dot.classList.replace("bg-green-500", "bg-red-500");
    dot.classList.add("animate-pulse");
    
    document.getElementById("walletLabel").innerText = "Connect Wallet";
    document.getElementById("profileMenu").classList.remove("show");
    
    // Balances reset
    document.getElementById("usdcBal").innerText = "0.00";
    document.getElementById("inrBal").innerText = "0.00";
    document.getElementById("txList").innerHTML = `<p class="text-[9px] text-center opacity-30 italic">No transactions found on Arc Network</p>`;
    
    alert("Wallet Disconnected!");
}

// 4. BALANCES & HISTORY
async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) { console.log("Balance fetch error"); }
}

async function getTxLogs() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -500, "latest");
        const list = document.getElementById("txList");
        
        if(logs.length === 0) return;
        
        list.innerHTML = logs.slice(-3).reverse().map(l => `
            <div class="flex justify-between items-center bg-white/40 p-3 rounded-xl border border-black/5 shadow-sm">
                <div>
                    <p class="text-[7px] font-black text-[#000080]">SENT</p>
                    <p class="text-[8px] font-mono opacity-60">${l.args.to.slice(0,18)}...</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-black text-red-600">-${ethers.utils.formatUnits(l.args.value, 6)}</p>
                </div>
            </div>`).join('');
    } catch (e) { console.log("Logs error"); }
}

// 5. UTILS
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); document.getElementById("profileMenu").classList.remove("show"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

// Close menu on click outside
window.onclick = (e) => { if (!e.target.matches('#walletBtn, #walletBtn *')) document.getElementById("profileMenu").classList.remove("show"); }
