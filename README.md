# ZKP2P Zelle Cashback Campaign Dashboard

This project is a simple web dashboard that displays wallet activity for the **ZKP2P Zelle Cashback Campaign**. It fetches data from a [Dune Analytics](https://dune.com/) query via a backend Express API, caches the results to avoid excessive API credit usage, and shows campaign progress in a clean, searchable table.

## Features

- [Pulls campaign data from Dune API](https://dune.com/queries/5199320) 
- Caches results for 12 hours to minimize Dune credit costs
- Search by wallet address
