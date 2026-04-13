LANDING PAGE
<img width="1710" height="1107" alt="Screenshot 2026-04-13 at 23 14 39" src="https://github.com/user-attachments/assets/b879ee22-ad42-4a56-b455-96003cc1fb24" />



ERC 20 FUNGIBLE TOKEN 
<img width="1710" height="1107" alt="Screenshot 2026-04-13 at 23 14 58" src="https://github.com/user-attachments/assets/242a2a22-e2e2-4e70-ba5d-64ce80e9c5e0" />



ERC 721 NFT 
Write Operations
<img width="1710" height="1107" alt="Screenshot 2026-04-13 at 23 15 34" src="https://github.com/user-attachments/assets/ba0d19e6-0b03-419b-bd47-236c280c0e74" />
Read Operations, Admin Controls and NFT Gallery 
<img width="1710" height="1107" alt="Screenshot 2026-04-13 at 23 17 20" src="https://github.com/user-attachments/assets/a05ecfde-c534-433e-b77e-8c2eaa92430c" />



ERC 1155 Multi Token 
Write Operations
<img width="1710" height="1107" alt="Screenshot 2026-04-13 at 23 18 01" src="https://github.com/user-attachments/assets/7e811907-bfc9-41e0-9712-7d28026fcee8" />
Read Operations, Admin Control
<img width="1710" height="1107" alt="Screenshot 2026-04-13 at 23 18 37" src="https://github.com/user-attachments/assets/c58daf15-a383-4945-88c6-564156988b96" />



EIP-2981 Royalties 
<img width="1710" height="1107" alt="Screenshot 2026-04-13 at 23 19 00" src="https://github.com/user-attachments/assets/e6eacd20-b4b0-44e5-a3a6-1d2e17aca4e6" />


Changes Overall: 
Path	                                                Type	      Change Description

src/app/page.tsx	                                    Frontend	  Token Studio selector added
contracts/contracts/erc721/src/lib.rs	                Backend	    Upgraded smart contract logic
contracts/contracts/erc1155/	                        Backend	    New contract added
contracts/contracts/erc20/	                          Backend	    New contract added
contracts/contracts/eip2981/	                        Backend	    New contract added
src/components/TokenStudioLanding.tsx                 Frontend	  New component created
src/components/ERC20Panel.tsx	                        Frontend	  New → Updated implementation
src/components/ERC1155Panel.tsx                      	Frontend	  New → Updated implementation
src/components/EIP2981Panel.tsx	                      Frontend	  New → Updated implementation
src/lib/erc721-stylus/src/ERC721InteractionPanel.tsx	Frontend	  Upgraded interaction panel
src/lib/erc1155/	                                    Frontend	  New module added
src/lib/erc20/	                                      Frontend	  New module added
src/lib/eip2981/	                                    Frontend	  New module added
