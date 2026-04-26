// 1. MANUAL CONNECT (Har baar naya selection prompt dega)
async function connectWallet() {
    if (!window.ethereum) return alert("Bhai, MetaMask ya OKX install karlo!");

    try {
        // --- YE SABSE ZAROORI HAI ---
        // Isse wallet purana session bhool jayega aur account select karne bolega
        await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
        });

        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Auto-Switch to Arc Network
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

        setupWallet(accounts[0]);

    } catch (e) {
        console.error("User ne cancel kar diya ya error aaya", e);
    }
}

// 2. DISCONNECT (LocalStorage clear karke reload karega)
function disconnectWallet() {
    userAddress = "";
    localStorage.removeItem("isWalletConnected");
    
    // UI Reset to default
    document.getElementById("dot").classList.replace("bg-green-500", "bg-red-500");
    document.getElementById("dot").classList.add("animate-pulse");
    document.getElementById("walletLabel").innerText = "Connect Wallet";
    
    alert("Disconnected! Ab naya wallet/account select kar sakte ho.");
    location.reload(); // Reload zaroori hai browser state clear karne ke liye
}
