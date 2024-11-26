# Authorization

Authorize and then use DIDs where needed. At the moment, Ethereum and Solana accounts
are supported. Reference the chain/network specific libraries for more info on how to
use each. Additional accounts will be supported in the future. 

Authorize with an Ethereum account using [@didtools/pkh-ethereum](https://did.js.org/docs/api/modules/pkh_ethereum):

```js
import { DIDSession } from 'did-session'
import { EthereumWebAuth, getAccountId } from '@didtools/pkh-ethereum'

const ethProvider = // import/get your web3 eth provider
const addresses = await ethProvider.request({ method: 'eth_requestAccounts' })
const accountId = await getAccountId(ethProvider, addresses[0])
const authMethod = await EthereumWebAuth.getAuthMethod(ethprovider, accountId)

const session = await DIDSession.get(accountId, authMethod, { resources: [...]})
```

Authorize with a Solana account using [@didtools/pkh-solana](https://did.js.org/docs/api/modules/pkh_solana):

```js
import { DIDSession } from 'did-session'
import { SolanaWebAuth, getAccountIdByNetwork } from '@didtools/pkh-solana'

const solProvider = // import/get your Solana provider (ie: window.phantom.solana)
const address = await solProvider.connect()
const accountId = getAccountIdByNetwork('mainnet', address.publicKey.toString())
const authMethod = await SolanaWebAuth.getAuthMethod(solProvider, accountId)

const session = await DIDSession.get(accountId, authMethod, { resources: [...]})
```

With your session, use DIDs in composedb, ceramic & glaze libraries:

```js
const ceramic = new CeramicClient()
ceramic.did = session.did
```
# Configuration

When creating a DID session, you need to pass an array of string identifiers for resources you want to authorize
for. In the context of the Ceramic Network, resources are an array of Model Stream Ids or Streams Ids. Typically
you will just pass resources from the `@composedb` libraries as you will already manage your Composites and Models 
there. For example:

```js
import { ComposeClient } from '@composedb/client'

//... Reference above and `@composedb` docs for additional configuration here

const client = new ComposeClient({ceramic, definition})
const resources = client.resources
const session = await DIDSession.get(accountId, authMethod, { resources })
client.setDID(session.did)
```

If you are still using `@glazed` libraries and tile document streams you will typically pass a wildcard resource, 
this all allows 'access all'. While not ideal, there is technical limits in `@glazed` libraries and tile document
streams that make it difficult to offer more granular permission access to sets of stream. Authorization was mostly 
designed with model document streams and `@composedb` libraries in mind. Wildcard resource may not be supported in
the future.

```js
const session = await DIDSession.get(accountId, authMethod, { resources: [`ceramic://*`]})
```

By default a session will expire in 1 week. You can change this time by passing the `expiresInSecs` option to
indicate how many seconds from the current time you want this session to expire.

```js
const oneDay = 60 * 60 * 24
const session = await DIDSession.get(accountId, authMethod, { resources: [...], expiresInSecs: oneDay })
```
# Add Support for a Blockchain

The standard use of [SIWX](https://github.com/ChainAgnostic/CAIPs/pull/122), [CACAO](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-74.md) and [DID:PKH](https://github.com/w3c-ccg/did-pkh/blob/main/did-pkh-method-draft.md) allows anyone to implement support for another blockchain or account type to authenticate and authorize writes to the Ceramic Network. Additionally a few standard interfaces enables you to implement an auth and verification library that allows anyone to use it with [`did-session`](https://github.com/ceramicnetwork/js-did/tree/main/packages/did-session), the primary library to use DID based accounts with Ceramic. There is just a few steps you have to take, outlined below.

### CASA Standards Support 

First make sure your blockchain has the necessary standards specification in the [Chain Agnostic Standards Alliance (CASA)](https://github.com/ChainAgnostic/CASA). CASA creates blockchain agnostic standards which support interoperability and facilitate communication between blockchain protocols, software and companies. Standards are submitted as [Chain Agnostic Improvement Proposals (CAIPs)](https://github.com/ChainAgnostic/CAIPs). Support in Ceramic requires a spec for the following CAIPs in the CASA namespace for your chain.  

1) CAIP2 - [Blockchain ID Specification](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md)

2) CAIP10 - [Account ID Specification](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md)

3) CAIP122 - [Sign in With X (SIWx)](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-122.md)

The CASA namespaces can be found [here](https://github.com/ChainAgnostic/namespaces). If your blockchain already exists and has the prior 3 CAIPs, then you can move on to the next steps. If not, then you can define these specs yourself by following the instructions in the namespace readme and opening a PR. You can look at other blockchain namespaces for how to format and specify your specs and reference your own ecosystem standards for some if they exist already. You can reach out to the 3Box Labs team for reviews and help if needed. 

### DID:PKH Standards Support 

With accounts defined through CAIP10 you can now add standards support in DID:PKH for your blockchain. To add support simply add a test vector in the [did-pkh repo](https://github.com/w3c-ccg/did-pkh) that shows what a DID document resolution would look like for an example DID:PKH account for your blockchain. Reference other test vectors for examples and open a PR once ready.

### CACAO Support 

[CACAO](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-74.md) is a chain-agnostic Object Capability ([OCAP](https://en.wikipedia.org/wiki/Object-capability_model)). CACAO allows us to create DID sessions by transferring the rights to write/update specific Ceramic streams from a DID:PKH (blockchain account) to a browser session key. Session keys then can sign all Ceramic writes, needing to only sign with your blockchain account once. To add support for your blockchain we need be able to translate from SIWX messages to a CACAO (and back) and describe how to sign a SIWX. The library [`@didtools/cacao`](https://github.com/ceramicnetwork/js-did/tree/main/packages/cacao) implements this. 

To add support, first implement a SIWX class specific to your blockchain, based on the CAIP122 spec defined above. The file should be added to `src/siwx/siw(name).ts` and extend `SiwxMessage`. Typically you should only have to implement the function `signMessage()` which encodes a SIWX message in the format needed to sign message payloads in your ecosystem. Reference the Solana (SIWS) and Ethereum (SIWE) implementations for example. 

Lastly in `src/cacao.ts` implement a `fromSiw(name)Message` function for your blockchain which translates a given SIWX message to a CACAO. Again reference both SIWS and SIWE for example implementations. 

Once added, open a PR. You can reach out to the 3Box Labs team for reviews and help if needed. 

### DID-Session and Ceramic Support 

To support your blockchain account as DID:PKH in Ceramic you need to be able to both sign and verify CACAOs. Signing and verifying is often specific to a chain depending on the ecosystem wallets, cryptography used and ecosystem standards. Each blockchain adds support by implementing an AuthMethod and Verifier in a blockchain specific library in the [`js-did` monorepo](https://github.com/ceramicnetwork/js-did). Reference existing chains, both Solana and Ethereum for example.

Authmethods are the primary interface used by [`did-session`](https://github.com/ceramicnetwork/js-did/tree/main/packages/did-session). It has the following interface: 

```tsx
type AuthMethod = (opts: AuthMethodOpts) => Promise<Cacao>
```

Typically you will write a function or class that returns a configured AuthMethod and provides any specific helper functions that help a developer use your blockchain with an AuthMethod.

Verifiers are used by Ceramic nodes to verify signed commits by a DID:PKH and CACAO. Nodes must register the verifiers needed for the blockchains and accounts they want to support. Right now most are included by default, once implemented. Verifers have the following interface. 

```tsx
export type Verifiers = Record<string, CacaoVerifier>

export type CacaoVerifier = (cacao: Cacao, opts: VerifyOptions) => Promise<void>
```

To add support you create a `@didtools/pkh-(namespace)` package in the [`js-did` monorepo](https://github.com/ceramicnetwork/js-did). Use the existing `@didtools/pkh-ethereum` and `@didtools/pkh-solana` libraries as a template to implement similar naming, functionality, documentation and testing. But primarily the library should export a `Verifier` and a function or class the gives the developer a configured `AuthMethod`. Once ready open a PR. You can reach out to the 3Box Labs team for reviews and help if needed. 

### Ready, Set, Go

Once your library and PR are accepted, we will release them for everyone to use and add verifier support for them in Ceramic. We aim to have each maintained by their respective ecosystems when possible, as we dont have the knowledge of all details and specifications in each ecosystem to best support each and every one. If they fall out of date, or tests begin to fail, we may not be able to maintain them ourselves. 

Congrats, now everyone can auth and write to Ceramic directly with their blockchain account of your choice.
# Concepts overview

Ceramic uses the [Decentralized Identifier (DID)](https://w3c.github.io/did-core/) standard for users accounts. DIDs require no central authority - users control their data and whom they share it with.

## DID Methods

We encourage using the `did:pkh` DID method which generates a persistent id from a wallet address’s public key hash. This enables one-click sign-on with your wallet to many apps on Ethereum, and soon on many other chains including Solana.

## DID Sessions

DID-Sessions is a library for providing a familiar, "web session"-like experience. Users no longer have to sign every single action they take within an app - during a timebound period of time they can authorize the app developer to act on their behalf. DID-Sessions outputs verifiable, serializable objects that store information about which DIDs authenticated them, what capabilities they are authorized with and for how long. 
---
title: "Upgrading DID Session"
---

## Upgrading from `did-session@0.x.x` to `did-session@1.x.x` 

AuthProviders change to AuthMethod interfaces. Similarly you can import the auth libraries you need. How you configure and manage 
these AuthMethods may differ, but each will return an AuthMethod function to be used with did-session.

```js
// Before with v0.x.x
//...
import { EthereumAuthProvider } from '@ceramicnetwork/blockchain-utils-linking'
 
const ethProvider = // import/get your web3 eth provider
const addresses = await ethProvider.request({ method: 'eth_requestAccounts' })
const authProvider = new EthereumAuthProvider(ethProvider, addresses[0])
const session = new DIDSession({ authProvider })
const did = await session.authorize()

// Now did-session@1.0.0
...
import { EthereumWebAuth, getAccountId } from '@didtools/pkh-ethereum'
 
const ethProvider = // import/get your web3 eth provider
const addresses = await ethProvider.request({ method: 'eth_requestAccounts' })
const accountId = await getAccountId(ethProvider, addresses[0])
const authMethod = await EthereumWebAuth.getAuthMethod(ethProvider, accountId)
const session = await DIDSession.authorize(authMethod, { resources: [...]})
const did = session.did
```

# Upgrading From `@glazed/did-session` to `did-session`

`authorize` changes to a static method which returns a did-session instance and `getDID()` becomes a `did` getter. For example:

```js
// Before @glazed/did-session
const session = new DIDSession({ authProvider })
const did = await session.authorize()

// Now did-session
const session = await DIDSession.authorize(authProvider, { resources: [...]})
const did = session.did
```

Requesting resources are required now when authorizing, before wildcard (access all) was the default. You can continue to use
wildcard by passing the following * below. Wildcard is typically only used with `@glazed` libraries and/or tile documents and
it is best to switch over when possible, as the wildcard option may be * deprecated in the future. When using with
composites/models you should request the minimum needed resources instead.

```js
const session = await DIDSession.authorize(authProvider, { resources: [`ceramic://*`]})
const did = session.did
```
# Using With ComposeDB Client

[ComposeDB](https://composedb.js.org) is a set of TypeScript libraries and tools to interact with the [Dataverse](https://blog.ceramic.network/into-the-dataverse/) using the [Ceramic network](https://ceramic.network/).

First, you should start with creating your instance of `ComposeClient` from `@composedb/client` package, passing it the
url to the ceramic node you want to use and the runtime composite definition of the composite you want to use in your App.

```js
import { ComposeClient } from '@composedb/client'
import { definition } from './__generated__/definition.js'

const compose = new ComposeClient({ ceramic: 'http://localhost:7007', definition })
```

Next, you can create a DID Session, passing it the resources from your client instance. The resources are a list of model
stream IDs from your runtime composite definition:

```js
import { DIDSession } from 'did-session'
import type { AuthMethod } from '@didtools/cacao'
import { EthereumWebAuth, getAccountId } from '@didtools/pkh-ethereum'

const ethProvider = // import/get your web3 eth provider
const addresses = await ethProvider).request({ method: 'eth_requestAccounts' })
const accountId = await getAccountId(ethProvider, addresses[0])
const authMethod = await EthereumWebAuth.getAuthMethod(ethProvider, accountId)

const loadSession = async(authMethod: AuthMethod, resources: Array<string>):Promise<DIDSession> => {
  return DIDSession.authorize(authMethod, { resources })
}

const session = await loadSession(authMethod, compose.resources)
```

Next, you can assign the authorized did from your session to your client. 

```js
compose.setDID(session.did)

// use the compose instance to make queries in ComposeDB graph
```

Before you start making mutations with the client instance, you should make sure that the session is not expired
```js
// before compose mutations, check if session is still valid, if expired, create new
if (session.isExpired) {
  const session = loadSession(authMethod)
  compose.setDID(session.did)
}

// continue to make mutations
```

A typical pattern is to store a serialized session in local storage and load on use if available.

:::caution Warning
LocalStorage is used for illustrative purposes here and may not be best for your app, as
there is a number of known issues with storing secret material in browser storage. The session string
allows anyone with access to that string to make writes for that user for the time and resources that
session is valid for. How that session string is stored and managed is the responsibility of the application.
:::

```js
// An updated version of loadSession(...)
const loadSession = async(authMethod: AuthMethod, resources: Array<string>):Promise<DIDSession> => {
  const sessionStr = localStorage.getItem('didsession')
  let session

  if (sessionStr) {
    session = await DIDSession.fromSession(sessionStr)
  }

  if (!session || (session.hasSession && session.isExpired)) {
    session = await DIDSession.authorize(authMethod, { resources })
    localStorage.setItem('didsession', session.serialize())
  }

  return session
}
```
# Welcome to Decentralized Identifiers

A suite of tools and APIs to interact with and manage decentralized identifiers (DIDs).
# Managing Sessions

A session can be managed in a few different ways. All sessions consist of a session key in the form of a `did:key` and a CACAO object-capability.

## Automatically persisted sessions

By default (when using `DIDSession.get(...)`) sessions are persisted to [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) in the background. The private key for this session is always a [non-extractable](https://developer.mozilla.org/en-US/docs/Web/API/CryptoKey/extractable) key, which means that they key itself can't be stolen by a malicious browser extension or script.

You can check if there already exists an authorized session for any given account using the `hasSessionFor` method. This can be useful if you want to know if the `DIDSession.get` call with result in a wallet interaction from the user, which will happen if `hasSessionFor` returns `false`.

```js
if (await DIDSession.hasSessionFor(accountId, resources: [...])) {
  console.log(`There is an active session for ${accountId}`)
}
```

### Removing a persisted session

If you want to remove a persisted session that was created using `DIDSession.get(...)`, you can use the static function `remove`. This will permanently remove the persisted session for a given account, and the user would need to reauthenticate in order to establish a new session.

```js
await DIDSession.remove(accountId)
```


### Session lifecycle management

Additional helper fields are available on DIDSession instances. They can help you manage a session lifecycle and the user experience. For example, if a session has expired you might want to show a message to the user before you ask them for a new session.

```js
// Check if authorized or created from existing session string
didsession.hasSession

// Check if session expired
didsession.isExpired

// Get resources session is authorized for
didsession.authorizations

// Check number of seconds till expiration, may want to re auth user at a time before expiration
didsession.expiresInSecs
```


## Manual session management

If you don't want to rely on browsers non-extractable keys, or you are not in a browser environment you can use the `DIDSession.authorize(...)` function. This function creates a session that can be serialized to a string. You can store this for later and then re-initialize. Currently sessions are valid
for 1 week by default.

```js
// Create session as above, store for later
const session = await DIDSession.authorize(authMethod, { resources: [...]})
const sessionString = session.serialize()

// write/save session string where you want (e.g. filesystem)
// ...

// Later re initialize session
const session2 = await DIDSession.fromSession(sessionString)
```
# The Composable Data Network

Ceramic is a decentralized data network that powers an ecosystem of interoperable Web3 applications and services. Ceramic's event streaming protocol is a highly-scalable decentralized data infrastructure used for building all kinds of interoperable Web3 services and protocols, such as decentralized databases. Ceramic-powered databases and services enable thousands of Web3 developers to build data-intensive applications and solve the world's most complex data challenges. By decentralizing application databases, Ceramic makes data composable and reusable across all applications.

![Introduction](/img/ceramic-overview.png)


## Introduction to Ceramic
---

- Head to the [**OrbisDB**](./orbisdb-overview.md) section to learn more about the database products built on Ceramic that allow you to easily interact with the data stored on Ceramic using a simple and familiar SQL-based interface.

- Head to the [**ComposeDB**](./composedb-overview.md) section to learn more about stream-level Ceramic functionality.

- Head to the [**Ceramic Protocol**](./protocol-overview.md) section to learn about lower-level Ceramic functionality

- Explore use cases and projects [**built on Ceramic**](https://threebox.notion.site/Ceramic-Ecosystem-a3a7a58f81544d33ad3feb84368775d4)

## Build Applications

---

### [**OrbisDB: advanced decentralized database with SQL interface→**](./orbisdb-overview.md)
OrbisDB is an advanced decentralized database built on the Ceramic Data Network. It comes with a set of plugins allowing unlimited customization options.


### [**ComposeDB: Graph DB for Web3 Apps →**](../composedb/getting-started)

ComposeDB is a decentralized graph database powered by Ceramic that enables you to build powerful Web3 applications using composable data, GraphQL, and reusable models. ComposeDB is the newest and most popular database built on Ceramic.

## Run a Ceramic Node

---

Run a Ceramic node to provide data storage, compute, and bandwidth for your Ceramic application. Today there are no tokenized incentives for running a Ceramic node, but by running a node you can ensure the data for your app remains available while helping contribute to the network's decentralization.

- [**Run Ceramic in the cloud**](../protocol/js-ceramic/guides/ceramic-nodes/running-cloud)

- [**Run Ceramic locally**](../protocol/js-ceramic/guides/ceramic-nodes/running-locally)


# Ceramic Roadmap

<head>
  <meta name="robots" content="noindex" />
  <meta name="googlebot" content="noindex" />
</head>

Since the launch of the ComposeDB Beta, the core Ceramic team remains committed to making ongoing improvements
to both ComposeDB and the underlying Ceramic protocol. Concurrently, we seek to involve the Ceramic developer
community in shaping Ceramic's future. We value your active participation in helping us prioritize the features 
and improvements that matter most to our developer base.

**All current and future projects are outlined in the [Ceramic roadmap](https://github.com/orgs/ceramicstudio/projects/2).**

We welcome your feedback and insights on our roadmap priorities. You can show your support or express your concerns
about projects on the roadmap by upvoting or downvoting them. Additionally, we encourage you to leave more detailed 
comments, making suggestions or indicating relevant feature requests.# ComposeDB
![Introduction](/img/intro-dataverse.png)

ComposeDB is a composable graph database built on [Ceramic](https://ceramic.network), designed for Web3 applications. 

### Use Cases
| Use Case  | Examples  |
|---|---|
|__Decentralized identity__| `user profiles` `credentials` `reputation systems` |
|__Web3 social__| `social graphs` `posts` `reactions` `comments` `messages` |
|__DAO tools__| `proposals` `projects` `tasks` `votes` `contribution graphs` |
|__Open information graphs__| `DeSci graphs` `knowledge graphs` `discourse graphs` |

### Why ComposeDB?

-  Store and query data with powerful, easy-to-use GraphQL APIs
-  Build faster with a catalog of plug-and-play schemas
-  Bootstrap content by plugging into a composable data ecosystem
-  Deliver great UX with sign-in with Ethereum, Solana, and more
-  Eliminate trust and guarantee data verifiability
-  Scale your Web3 data infrastructure beyond L1 or L2 blockchains

### Project Status: `Beta`

ComposeDB officially entered `Beta` on February 28, 2023. What does this mean?

- You can now build and deploy apps to production on mainnet! 
- Core features like GraphQL APIs, reusable models, and data composability are available
- We will continue to improve performance and add more features
- We are not yet guaranteeing a 100% stable, bug-free platform

If you want to provide feedback, request new features, or report insufficient performance, please [make a post on the Forum](https://forum.ceramic.network/), as we'd like to work with you.
Thank you for being a ComposeDB pioneer and understanding that great Web3 protocols take time to mature.

---


### [Get Started →](../composedb/getting-started) 
Build a Hello World application and interact from the CLI.

### [ComposeDB Sandbox →](/docs/composedb/sandbox) 
Test example queries to ComposeDB directly in your browser.

### [Development Guides →](../composedb/guides)
Learn about data modeling, application set up, and data interactions.
<!-- Server Config-->

### [Core concepts →](../composedb/core-concepts)
Dive deeper into the ComposeDB protocol and its components.
  
### [Community →](../ecosystem/community)
Connect with the ComposeDB developer community.# Decentralized Identifiers

Cermic comes with a suite of tools and APIs to interact with and manage decentralized identifiers (DIDs). DIDs require no central authority - users control their data and whom they share it with.

## DID Methods
We encourage using the did:pkh DID method which generates a persistent id from a wallet address’s public key hash. This enables one-click sign-on with your wallet to many apps on Ethereum, and soon on many other chains including Solana. We also support the Ceramic-created 3ID method which acts as an aggregator for multiple accounts and can handle multiple keys simulatneously.

## DID Sessions

DID-Sessions is a library for providing a familiar, "web session"-like experience. Users no longer have to sign every single action they take within an app - during a timebound period of time they can authorize the app developer to act on their behalf. DID-Sessions outputs verifiable, serializable objects that store information about which DIDs authenticated them, what capabilities they are authorized with and for how long.

# OrbisDB

OrbisDB is a simple and efficient gateway for storing and managing open data on Ceramic.

OrbisDB provides a developer-friendly SQL interface to explore and query data on Ceramic as well as a user interface and plugin store to save development time on crypto-specific features – from data migration and token gating mechanisms to automated blockchain interactions. It is built on Ceramic's new Data Feed API which makes it fully compatible with [ComposeDB](./composedb-overview).

OrbisDB comes with with a shared instance called [Orbis Studio](https://app.formo.so/hJ5VGyugmGigyVFyqdHJa), offering a simple experience to get started with building on Orbis and accessing plugins. [Get access to the Orbis Studio](https://app.formo.so/hJ5VGyugmGigyVFyqdHJa) (currently in Closed Beta) and start building!



# Ceramic Protocol

Ceramic is a decentralized event streaming protocol that enables developers to build decentralized databases, distributed compute pipelines, and authenticated data feeds, etc. Ceramic nodes can subscribe to subsets of streams forgoing the need of a global network state. This makes Ceramic an eventually consistent system (as opposed to strongly consistent like L1 blockchains), enabling web scale applications to be built reliably.


## Core Components

---

The Ceramic protocol consists of the following components:

- [**Streams →**](../protocol/js-ceramic/streams/streams-index)
- [**Accounts →**](../protocol/js-ceramic/accounts/accounts-index.md)
- [**Networking →**](../protocol/js-ceramic/networking/networking-index.md)
- [**Ceramic API →**](../protocol/js-ceramic/api.md)
- [**Ceramic Nodes →**](../protocol/js-ceramic/nodes/overview.md)


## Specification Status

---

| Section | State |
| --- | --- |
| [1. Streams](../protocol/js-ceramic/streams/streams-index) | **[<span styles="color:rgba(203, 145, 47, 1)">Draft/WIP</span>](../protocol/js-ceramic/streams/streams-index)** |
| [1.1. Event Log](../protocol/js-ceramic/streams/event-log) | **[<span styles="color:rgba(68, 131, 97, 1)">Reliable</span>](../protocol/js-ceramic/streams/event-log)** |
| [1.2. URI Scheme](../protocol/js-ceramic/streams/uri-scheme) | **[<span styles="color:rgba(68, 131, 97, 1)">Reliable</span>](../protocol/js-ceramic/streams/uri-scheme)** |
| [1.3. Consensus](../protocol/js-ceramic/streams/consensus) | **[<span styles="color:rgba(203, 145, 47, 1)">Draft/WIP</span>](../protocol/js-ceramic/streams/consensus)** |
| [1.4. Lifecycle](../protocol/js-ceramic/streams/lifecycle) | **[<span styles="color:rgba(68, 131, 97, 1)">Reliable</span>](../protocol/js-ceramic/streams/lifecycle)** |
| [2. Accounts](../protocol/js-ceramic/accounts/accounts-index) | **[<span styles="color:rgba(203, 145, 47, 1)">Draft/WIP</span>](../protocol/js-ceramic/accounts/accounts-index)** |
| [2.1. Decentralized Identifiers](../protocol/js-ceramic/accounts/decentralized-identifiers) | **[<span styles="color:rgba(203, 145, 47, 1)">Draft/WIP</span>](../protocol/js-ceramic/accounts/decentralized-identifiers)** |
| [2.2. Authorizations](../protocol/js-ceramic/accounts/authorizations) | **[<span styles="color:rgba(68, 131, 97, 1)">Reliable</span>](../protocol/js-ceramic/accounts/authorizations)** |
| [2.3. Object-Capabilities](../protocol/js-ceramic/accounts/object-capabilities) | **[<span styles="color:rgba(203, 145, 47, 1)">Draft/WIP</span>](../protocol/js-ceramic/accounts/object-capabilities)** |
| [3. Networking](../protocol/js-ceramic/networking/networking-index) | **[<span styles="color:rgba(203, 145, 47, 1)">Draft/WIP</span>](../protocol/js-ceramic/networking/networking-index)** |
| [3.1. Tip Gossip](../protocol/js-ceramic/networking/tip-gossip) | **[<span styles="color:rgba(68, 131, 97, 1)">Reliable</span>](../protocol/js-ceramic/networking/tip-gossip)** |
| [3.2. Tip Queries](../protocol/js-ceramic/networking/tip-queries) | **[<span styles="color:rgba(68, 131, 97, 1)">Reliable</span>](../protocol/js-ceramic/networking/tip-queries)** |
| [3.3. Event Fetching](../protocol/js-ceramic/networking/event-fetching) | **[<span styles="color:rgba(68, 131, 97, 1)">Reliable</span>](../protocol/js-ceramic/networking/event-fetching)** |
| [3.4. Network Identifiers](../protocol/js-ceramic/networking/networks) | **[<span styles="color:rgba(68, 131, 97, 1)">Reliable</span>](../protocol/js-ceramic/networking/networks)** |
| [4. API](../protocol/js-ceramic/api) | **[<span styles="color:rgba(212, 76, 71, 1)">Missing</span>](../protocol/js-ceramic/api)** |
| [5. Nodes](../protocol/js-ceramic/nodes/overview) | **[<span styles="color:rgba(203, 145, 47, 1)">Draft/WIP</span>](../protocol/js-ceramic/nodes/overview)** |

#### **Legend**

| Spec state | Label |
| --- | --- |
| Unlikely to change in the foreseeable future. |  **<span styles="color:rgba(51, 126, 169, 1)">Stable</span>** |
| All content is correct. Important details are covered. | **<span styles="color:rgba(68, 131, 97, 1)">Reliable</span>** |
| All content is correct. Details are being worked on. | **<span styles="color:rgba(203, 145, 47, 1)">Draft/WIP</span>** |
| Do not follow. Important things have changed. | **<span styles="color:rgba(217, 115, 13, 1)">Incorrect</span>** |
| No work has been done yet. | **<span styles="color:rgba(212, 76, 71, 1)">Missing</span>** |


# Technical requirements to run Ceramic

To understand the expected costs to integrate Ceramic into your architecture, it is helpful to first understand where Ceramic lives in the application architecture stack.

Ceramic is a decentralized data storage network made up of different components, and can replace or augment existing storage solutions.

![Architecture](/img/app-architecture-overview.png)


To make it easier to grasp, you can think about implementing Ceramic just like you might think about implementing a traditional SQL or PostgreSQL database.

When integrating with Ceramic, you will be running a few different services and components, each serving a specific purpose for running your application:

- `js-ceramic` - provides the HTTP API access for connected clients to read the streams stored on the Ceramic network
- `ceramic-one` - responsible for storing the actual data and coordinate with network participants.
- `PostgreSQL` - used for indexing data
- `Ethereum RPC node API access` - required to validate Ceramic Anchor Service (CAS) anchors.
- `Ceramic Anchor Service (CAS) access` - Anchors Ceramic protocol proofs to the blockchain. This service is currently funded by 3box Labs, however, eventually, this function will be provided by node operators and with some expected cost. 

Ceramic nodes are simply pieces of software than run on a server. PostgreSQL is a type of traditional database.

## Hardware requirements

For most projects, all three components of Ceramic can be run on the same server. Thus the main consideration impacting costs are the hardware requirements of your server.

Depending on the expected throughput of your project, the suggested hardware requirements will differ. Below, you can find the estimated hardware requirements based on a different levels of expected throughput.

### Minimum (light throughput)

| Resource | Size |
| --- | --- |
| CPU |  2 CPU Cores |
| RAM | 4GB |
| Storage | 110GB |



### Recommended

As your project scales, you may need to expand your storage beyond 180GB.

| Resource | Size |
| --- | --- |
| CPU | 4 CPU cores |
| RAM | 8 GB |
| Storage | 180GB |


### Advanced (heavy throughput)

Advanced users may want to consider running the PostgreSQL database on a different server than the Ceramic node.  If you choose to run them on different servers, a VPC can be used to establish the communication between them.



<div style={{ display: "flex", justifyContent: "flex-start" }}>
  <div style={{ marginRight: "100px" }}>
    <div style={{ fontWeight: "bold", marginBottom: "8px" }}>Ceramic node</div>
    <table style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "8px" }}>Resource</th>
          <th style={{ textAlign: "left", padding: "8px" }}>Size</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ textAlign: "left", padding: "8px" }}>CPU</td>
          <td style={{ textAlign: "left", padding: "8px" }}>2 4CPU Cores</td>
        </tr>
        <tr>
          <td style={{ textAlign: "left", padding: "8px" }}>RAM</td>
          <td style={{ textAlign: "left", padding: "8px" }}>8 GB</td>
        </tr>
        <tr>
          <td style={{ textAlign: "left", padding: "8px" }}>Storage</td>
          <td style={{ textAlign: "left", padding: "8px" }}>180GB</td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <div>
    <div style={{ fontWeight: "bold", marginBottom: "8px" }}>PostgreSQL DB</div>
    <table style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "8px" }}>Resource</th>
          <th style={{ textAlign: "left", padding: "8px" }}>Size</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ textAlign: "left", padding: "8px" }}>CPU</td>
          <td style={{ textAlign: "left", padding: "8px" }}>1 2CPU Cores</td>
        </tr>
        <tr>
          <td style={{ textAlign: "left", padding: "8px" }}>RAM</td>
          <td style={{ textAlign: "left", padding: "8px" }}>4 GB</td>
        </tr>
        <tr>
          <td style={{ textAlign: "left", padding: "8px" }}>Storage</td>
          <td style={{ textAlign: "left", padding: "8px" }}>110GB</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>



## Hosting solutions and costs

One of the key factors impacting costs is how you choose to host your Ceramic node.  A few options are shown below.  Monthly server costs are **estimated** based on the hardware requirements above.

<table style={{ width: "100%", borderCollapse: "collapse" }}>
  <tr>
    <th style={{ width: "33%", textAlign: "left", verticalAlign: "top" }}>Locally hosted</th>
    <th style={{ width: "33%", textAlign: "left", verticalAlign: "top" }}>Cloud hosted</th>
    <th style={{ width: "33%", textAlign: "left", verticalAlign: "top" }}>Managed node service</th>
  </tr>
  <tr>
    <td style={{ textAlign: "left", verticalAlign: "top" }}>- No new incremental costs</td>
    <td style={{ textAlign: "left", verticalAlign: "top" }}>- $25 - $250 per node per month</td>
    <td style={{ textAlign: "left", verticalAlign: "top" }}>- $50 - $500 per node per month</td>
  </tr>
  <tr>
    <td style={{ textAlign: "left", verticalAlign: "top" }}>- Not recommended for production environments</td>
    <td style={{ textAlign: "left", verticalAlign: "top" }}>- Dependent on cloud provider (e.g., AWS vs GCP vs Azure)</td>
    <td style={{ textAlign: "left", verticalAlign: "top" }}>- Managed backups</td>
  </tr>
  <tr>
    <td style={{ textAlign: "left", verticalAlign: "top" }}></td>
    <td style={{ textAlign: "left", verticalAlign: "top" }}>- Infrastructure professionals who manage their own servers should have lower costs than using a cloud provider</td>
    <td style={{ textAlign: "left", verticalAlign: "top" }}>- Application developers who prefer to use third party managed node services can offload node management responsibilities to dedicated professionals</td>
  </tr>
</table>


# Why Ceramic?

---

Ceramic's decentralized data network provides Web3 developers with a collection of features that make it possible to build scalable Web3 applications with composable data that can be reused and shared across applications.

## Overview

Ceramic compared to other popular Web3 infrastructure solutions.

|   | Ceramic  | L2s | L1s | Web2 DB |
|---|---|---|---|---|
|__UX__| 🟢 | 🔴 | 🔴 | 🟢 |
|__Low Cost__| 🟢 | 🟡 | 🔴 | 🟢 |
|__Web Scale__| 🟢 | 🟡 | 🔴 | 🟡 |
|__Composability__| 🟢 | 🟡 | 🟢 | 🔴 |
|__Verifiability__| 🟢 | 🟢 | 🟢 | 🔴 |
|__Permissionless__| 🟢 | 🟢 | 🟢 | 🔴 |
|__Designed for...__| Decentralized data | Decentralized finance | Decentralized finance | Centralized data |


## Key Benefits

---

### Mutable data storage
Ceramic provides developers with a set of standard, open APIs for storing, updating, and retrieving data from the network. This helps to break down data silos, enabling all data to be openly accessible. Additionally, all data mutations on Ceramic are cryptographically verifiable and can provide auditability throughout all historical versions of a piece of data that has changed over time.

### Data Composability

Data on Ceramic is structured and stored in data models, which can be easily reused by different applications to share
data between them. Data models are created by developers in the community, and the ecosystem of data models is constantly expanding. Data models typically represent a single, logical application feature such as a user profile, a social graph, or a blog and developers typically combine multiple data models to create their application.

### Developer Experience

Building composable applications with Web3 data on Ceramic is simple. Install Ceramic, browse the marketplace of data models, plug these models into your app, and automatically get access to all data stored on the network that conforms to those data models. The community is constantly creating new tooling that make it easier to build, and expand what's possible with composable data.

### Sign in with Web3

Ceramic uses the decentralized identifier (DID) standard for user accounts, which are compatible with all blockchain wallets. When using Ceramic in your application, users can authenticate with the Web3 wallets they already have, and can even control the same Ceramic account from multiple different blockchain wallets (cross-chain) if they'd like. Data models are typically account-centric, meaning that every user is in control of their own data.

### Decentralization

The Ceramic network is decentralized and permissionless, allowing anyone in the world to spin up a node to provide storage, compute, and bandwidth resources to users and applications built on the network. Today there are no tokenized incentives for running Ceramic, but the community is exploring options.

### Scalability

Ceramic's data network infrastructure is highly-scalable and can service use cases where high amounts of data throughput is needed. On Ceramic, every data object maintains its own state and nodes independently process stream transactions, allowing unbounded parallelization. This enables Ceramic to operate at worldwide data scale, which is orders of magnitude greater than the scale needed for decentralized finance.# Accounts
---

User-owned Ceramic accounts

### Overview

User owned data requires an account model that is both core to the protocol and general enough to support the wide diversity of possible account models and real world scenarios. Accounts are identified by Decentralized Identifiers, a general and extensible method to represent unique account strings, resolve public keys, and other account info or key material. Object-Capabilities are used to permission and authorize stream writes from one account to another, this may include session keys, applications and managing organization access. 

### [Decentralized Identifiers](decentralized-identifiers.md)

Decentralized Identifiers (DIDs) are used to represent accounts. DIDs are identifiers that enable verifiable, decentralized digital identities. They require no centralized party or registry and are extremely extensible, allowing a variety of implementations and account models to exist. 

### [Authorizations](authorizations.md)

Authorizations allow one account to delegate stream access to another account. While the current model is simple and minimal, it is descriptive enough to follow the rule of least privilege and limit the access that is delegated to another account. 

### [Object Capabilities](object-capabilities.md)

Object Capabilities or CACAO are the technical feature and implementation that enables support for permissions and a general and powerful capability-based authorization system over streams.# Authorizations
---

Authorization is the act of delegating access to a stream to an account that is different than its owner. As a best practice, when granting authorizations to another account you want to follow the rule of least privilege and only authorize that delegate's temporary key to write the minimally needed data to Ceramic. 

## Scopes

---

CACAO and Ceramic support a basic way to describe the resources and actions an authorization includes. The resource parameter is an array of strings. In Ceramic those strings are StreamIDs or model StreamIDs. The implied action is write access, as read access is not authorized in any way at the protocol level. Read access would require an encryption protocol, as streams are public, and is out of scope for now. 

:::note
    In the future, we expect the ability to specify more granular authorizations based on actions (write, delete, create, update etc) and resources.
:::

### Streams

For example, to authorize an account to write to only two specific streams, you would specify the streamIds as resources in the CACAO as follows:

```bash
[ "ceramic://kjzl6cwe1jw14bby1eybtqjr1w5l8xysitwmd34i8huccr7lk8g6xrt2l1c1ngn", "ceramic://kjzl6cwe1jw1476bbp2a0lg8gcmk9zj1xjanpg6dooc3golyb2fnmwmg0p6ane3"]
```

### Models

The mostly commonly used pattern is to specify authorizations by model streamIds. `model` is a property that can be defined in a streams init event. When specified and used with CACAO it allows a DID and key the ability to write to all streams with this specific model value for that user. 

:::note
    Ceramic will likely support other keys and values in streams beyond `model` for authorizations in the future.
:::

Models at the moment are primarily used as higher level concept built on top of Ceramic. A set of models will typically describe the entire write data-model of an application, making it a logical way for a user to authorize an application to write to all streams that is needed for that application. 

For example, a simple social application with a user profile and posts would have two corresponding models, a profile model and a post model. The CACAO would have the resources specified by an array of both model streamIds, shown below. This would allow a DID with this CACAO to create and write to any stream with these models. Allowing it to create as many posts as necessary. 

Resources defined by model streamID are formatted as `ceramic://*?model=<StreamId>` and would be defined as follows for the prior example. 

```bash
[ "ceramic://*?model=kjzl6hvfrbw6c7keo17n66rxyo21nqqaa9lh491jz16od43nokz7ksfcvzi6bwc", "ceramic://*?model=kjzl6hvfrbw6c99mdfpjx1z3fue7sesgua6gsl1vu97229lq56344zu9bawnf96"]
```

### Wildcard

Lastly a wildcard for all resources is supported. For security reasons, wildcard will be deprecated in the future and is only included here for completeness. 

```bash
[ "ceramic://*" ]
```# Identifiers
---

Ceramic streams rely on an account model to authenticate and authorize updates to a stream. A fully realized vision of user owned data includes the use of public key cryptography and the ability to sign data with a public-private key-pair controlled by a user. But key pairs alone are often not user friendly nor sufficient and don't fully represent the range of real world scenarios. 

## Decentralized Identifiers (DIDs)

---

Ceramic uses [Decentralized Identifiers (DIDs)](https://w3c.github.io/did-core/) to represent accounts. DIDs are identifiers that enable verifiable, decentralized digital identities. They require no centralized party or registry and are extremely extensible, allowing a variety of implementations and account models to exist. 

DID methods are specific implementations of the DID standard that define an identifier namespace along with how to resolve its DID document, which typically stores public keys for signing and encryption. The ability to resolve public keys from identifiers allows anyone to verify a signature for a DID. 

## Supported Methods

---

At this time, the following DID methods can be used with Ceramic: 

### PKH DID

**PKH DID Method**: A DID method that natively supports blockchain accounts. DID documents are statically generated from a blockchain account, allowing blockchain accounts to sign, authorize and authenticate in DID based environments. PKH DID is the primary and recommended method in Ceramic. [did:pkh Method Specification](https://github.com/w3c-ccg/did-pkh/blob/main/did-pkh-method-draft.md)

```bash
did:pkh:eip155:1:0xb9c5714089478a327f09197987f16f9e5d936e8a
```

### Key DID

**Key DID Method**: A DID method that expands a cryptographic public key into a DID Document, with support for Ed25519 and Secp256k1. Key DIDs are typically not used in long lived environments. [did:key Method Specification](https://w3c-ccg.github.io/did-method-key/)

```bash
did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

# Object Capabilities
---

Ceramic streams support [CACAO](https://chainagnostic.org/CAIPs/caip-74), allowing a basic but powerful capability-based authorization system to exist. CACAO, or "chain agnostic object capabilities", are composable, transferable and verifiable containers for authorizations and encoded in IPLD.  For the full CACAO specification and more examples, reference [CAIP-74: CACAO - Chain Agnostic CApability Object](https://chainagnostic.org/CAIPs/caip-74).

## Approach

---

Object capability-based authorization systems, of which CACAO is an implementation, are a natural way to represent authorizations in open and distributed systems. Object capabilities require little coordination, are only stored by parties that care about a particular capability, and are self-verifiable. 

Contrast this to popular authorization models like access controls lists (ACLs), which often rely on the ability to maintain an accurate, agreed-upon, and up to date list of authorizations. ACLs are simple and sufficient when you can rely on a single authoritative source to maintain the list, but quickly become difficult in a distributed setting. Maintaining a list amongst many unknown participants becomes a difficult consensus problem and often very costly at scale, requiring lots of upfront and continuous coordination. 

## Usage

---

CACAO enables the ability for one account to authorize another account to construct signatures over limited data on their behalf, or in this case write to a Ceramic stream. 

### Using blockchain accounts

When combined with ["Sign-in with X"](https://chainagnostic.org/CAIPs/caip-122), CACAO unlocks the ability for blockchain accounts to authorize Ceramic accounts (DIDs) to sign data on their behalf. 

This frequently used pattern in Ceramic greatly increases the the usability of user-owned data and public-key cryptography. Thanks to the adoption of blockchain based systems, many users now have the ability to easily sign data in web-based environments using their wallet and blockchain account. 

### Authorizing sessions

Data-centric systems like Ceramic often have more frequent writes than a blockchain system, so it can be impractical to sign every Ceramic stream event in a blockchain wallet. Instead with the use of CACAO and "Sign-in with X" many writes can be made by way of a temporary key and DID authorized with a CACAO. Allowing a user to only sign once with a blockchain based account and wallet, then continue to sign many payloads for an authorized amount of time (session).

:::note
In the future, we expect the ability to model the authorizations for more complex environments and structures including full organizations.
:::

## Specification

---

Support for object capabilities in the core Ceramic protocol is described below. Events in streams are signed payloads formatted in IPLD using DAGJWS (DAG-JOSE), as [described here](../streams/event-log.md). This describes how this is extended to construct a valid signed payload using CACAO in DAGJWS, by example of first constructing a JWS with CACAO. A JWS with CACAO can then be directly encoded with DAG-JOSE after. 

### JWS with CACAO

JWS CACAO support includes adding a `cap` parameter to the JWS Protected Header and specifying the correct `kid` parameter string. Here is an example protected JWS header with CACAO:

```bash
{ 
  "alg": "EdDSA",
  "cap": "ipfs://bafyreidoaclgf2ptbvflwalfrr6d4iqehkzyidwbzaouprdbjjfb4yim6q"
  "kid": "did:key:z6MkrBdNdwUPnXDVD1DCxedzVVBpaGi8aSmoXFAeKNgtAer8#z6MkrBdNdwUPnXDVD1DCxedzVVBpaGi8aSmoXFAeKNgtAer8"
 }
```

Where:

- `alg` - identifies the cryptographic algorithm used to secure the JWS
- `cap` - maps to a URI string, expected to be an IPLD CID resolvable to a CACAO object
- `kid` - references the key used to secure the JWS. In the scope here this is expected to be a DID with reference to any key in the DID verification methods. The parameter MUST match the `aud` target of the CACAO object for both the CACAO and corresponding signature to be valid together.


Since `cap` is currently not a registered header parameter name in the IANA "JSON Web Signature and Encryption Header Parameters" registry, we treat this as a "Private Header Parameter Name" for now with additional meaning provided by the CACAO for implementations that choose to use this specification.

This means that ignoring the `cap` header during validation will still result in a valid JWS payload by the key defined in the `kid`. It just has no additional meaning by what is defined in the CACAO. The `cap` header parameter could also have support added as an extension by using the `crit` (Critical) Header Parameter in the JWS, but there is little reason to invalidate the JWS based on a consumer not understanding the `cap` header given it is still valid.

### DagJWS with CACAO

#### Construction

Given JWS with CACAO described in prior section, follow the DAG-JOSE specification and implementations for the steps to construct a given JWS with CACAO header and payload into a DagJWS. DagJWS is very similar to any JWS, except that the payload is a base64url encoded IPLD CID that references the JSON object payload.

```bash
{ 
  cid: "bagcqcera2mews3mbbzs...quxj4bes7fujkms4kxhvqem2a",
  value: {
    jws: { 
      link: CID("bafyreidkjgg6bi4juwx...lb2usana7jvnmtyjb4xbgwl6e"),
      payload: "AXESIGpJjeCjiaWv...LKw6pIDQfTVrJ4SHlwmsvx", 
      signatures: [
        {
          protected: "eyJhbGciOiJFZERTQSIsImNh...GU2djZEpLTmhYSDl4Rm9rdEFKaXlIQiJ9"
          signature: "6usTYvu5KN0LFTQsWE9U-tqx...h60EgfvjL_rlAW7_tnQUl84sQyogpkLAQ"
        }
      ]
    }
  }
}
```

#### Verification

The following algorithm describes the steps required to determine if a given DagJWS with CACAO is valid:

1. Follow [DAG-JOSE specification](https://ipld.io/specs/codecs/dag-jose/spec/) to transform a given DagJWS into a JWS.
2. Follow JWS specifications to determine if the given JWS is valid. Verifying that the given signature paired with `alg` and `kid` in the protected header is valid over the given payload. If invalid, an error MUST be raised.
3. Resolve the given URI in `cap` parameter of the projected JWS header to a CACAO JSON object. Follow the [CAIP-74 CACAO](https://chainagnostic.org/CAIPs/caip-74) specification to determine if the given CACAO is valid. If invalid, an error MUST be raised.
4. Ensure that the `aud` parameter of the CACAO payload is the same target as the `kid` parameter in the JWS protected header. If they do not match, an error MUST be raised.

#### Example

Example IPLD dag-jose encoded block, strings abbreviated.

```bash
{ 
  cid: "bagcqcera2mews3mbbzs...quxj4bes7fujkms4kxhvqem2a",
  value: {
    jws: { 
      link: CID("bafyreidkjgg6bi4juwx...lb2usana7jvnmtyjb4xbgwl6e"),
      payload: "AXESIGpJjeCjiaWv...LKw6pIDQfTVrJ4SHlwmsvx", 
      signatures: [
        {
          protected: "eyJhbGciOiJFZERTQSIsImNh...GU2djZEpLTmhYSDl4Rm9rdEFKaXlIQiJ9"
          signature: "6usTYvu5KN0LFTQsWE9U-tqx...h60EgfvjL_rlAW7_tnQUl84sQyogpkLAQ"
        }
      ]
    }
  }
}
```

If `block.value.jws.signatures[0].protected` is decoded, you would see the following object, a JWS protected header as described above:

```bash
{
  "alg": "EdDSA",
  "cap": "ipfs://bafyreidoaclgf...yidwbzaouprdbjjfb4yim6q",
  "kid": "did:key:z6Mkq2ZyjGV54ev...hXH9xFoktAJiyHB#z6Mkq2ZyjGV54ev...hXH9xFoktAJiyHB"
}
```# Ceramic API
---
The new and improved Ceramic API is a work in progress. We will update this page when it's available. In the meantime, have a look at the [HTTP API](./guides/ceramic-clients/javascript-clients/ceramic-http.md) that's implemented by the current JS Ceramic implementation.
# DID JSON-RPC client

---

DID JSON-RPC client provides a simple JS API for interacting with Ceramic accounts.

## Things to know

---

- Provides the DID object, which must be authenticated, then mounted on the Ceramic object to perform transactions.
- For Ceramic nodes, the DID client acts as a way to resolve and verify transaction signatures
- For Ceramic clients, the DID client serves as a way to create an account, authenticate, sign, encrypt
- If your project requires transactions, you **need** to install this package or one that offers similar EIP-2844 API support.
- The DID client library can be used in both browser and Node.js environments.
- It supports any DID wallet provider that adheres to the [EIP-2844](https://eips.ethereum.org/EIPS/eip-2844) interface.
- Communicating between a Ceramic client and any account provider.
- Ceramic does not work without a DID client, as it is how all participants are identified and how transactions and messages are signed and verified.

## Installation

```sh
npm install dids
```

The `DID` class provides the interface on top of underlying account libraries. The next step is to set up your account system, which requires you to make some important decisions about your account model and approach to key management. This process consists of three steps: choosing your account types, installing a provider, and installing resolver(s).

## Choose your account types

Choosing an account type can significantly impact your users' identity and data interoperability.  For example, some account types are fixed to a single public key (Key DID, PHK DID), so the data is siloed to that key.  In contrast, others (3ID DID) have mutable key management schemes that can support multiple authorized signing keys and works cross-chain with blockchain wallets. Visit each account to learn more about its capabilities.

### [PKH DID](../../../accounts/decentralized-identifiers.md#pkh-did)

Based on Sign-in with Ethereum, or similar standards in other blockchain ecosystems. Good for users + most popular. Relies on existing wallet infrastructure.

### [Key DID](../../../accounts/decentralized-identifiers.md#key-did)

Simple, self-contained DID method.

## Install account resolvers

The next step is to install resolver libraries for all account types that you may need to read and verify data (signatures). This includes _at least_ the resolver for the provider or wallet chosen in the previous step. However, most projects install all resolvers to be safe:

| Account | Resolver libraries                                                            | Maintainer |
| ------- | ----------------------------------------------------------------------------- | ---------- |
| Key DID | [`key-did-resolver`](./key-did.md#key-did-resolver)                 | 3Box Labs  |

<!--
| PKH DID  | [`js-pkh-did-resolver →`]() | Spruce             |
| NFT DID  | [`3id/did-resolver →`]()    | @someonehandle.xyz |
| Safe DID | [`3id/did-resolver →`]()    | 3Box Labs          |
-->

## Install account providers

Install providers to manage accounts and sign transactions. Once you have chosen one or more account types, you'll need to install the providers for these account types. These will enable the client-side creation and use of accounts within your application. If your application uses Ceramic in a read-only manner without transactions, you do not need to install a provider.

### Using web wallets

However, the providers listed above are low-level, run locally, and burden developers with UX issues related to secret key management and transaction signing. Instead of using a local provider, you can alternatively use a wallet system. Wallets wrap providers with additional user experience features related to signing and key management and can be used in place of a provider. The benefit is multiple applications can access the same wallet and key management system, so users have a continuous experience between applications.



### Create your own wallet

One option is installing and setting up one or more account providers that run locally. Note that these local signers have different wallet support

| Account | Supported Key Types | Provider libraries                                               |
| ------- | ------------------- | ---------------------------------------------------------------- |
| Key DID | Ed25519             | [`key-did-provider-ed25519`](./key-did.md#ed25519)     |
| Key DID | Secp256k1           | [`key-did-provider-secp256k1`](./key-did.md#secp256k1) |

<!-- | PKH DID | ?????????           | [`js-pkh-did-provider →`]()           | -->

Note that NFT DID and Safe DID do not have a signer because they are compatible with all other providers.

## Setup your project

You should have installed DID.js and set up your account system, including authentication to perform transactions. When you include everything in your project, it should look like this. Note that the exact code will vary by your setup, including provider and wallet. Consult your provider's documentation for authentication specifics.

```ts
// Import DID client
import { DID } from 'dids'

// Add account system
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { getResolver } from 'key-did-resolver'

// Connect to a Ceramic node
const API_URL = 'https://your-ceramic-node.com'

// Create the Ceramic object
const ceramic = new CeramicClient(API_URL)

// ↑ With this setup, you can perform read-only queries.
// ↓ Continue to authenticate the account and perform transactions.

async function authenticateCeramic(seed) {
  // Activate the account by somehow getting its seed.
  // See further down this page for more details on
  // seed format, generation, and key management.
  const provider = new Ed25519Provider(seed)
  // Create the DID object
  const did = new DID({ provider, resolver: getResolver() })
  // Authenticate with the provider
  await did.authenticate()
  // Mount the DID object to your Ceramic object
  ceramic.did = did
}
```

## Common use-cases

### Authenticate the user

 :::caution

    This will flow will vary slightly depending on which account provider library you use. Please see the documentation specific to your provider library.
:::

```ts
import { CeramicClient } from '@ceramicnetwork/http-client'
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { getResolver } from 'key-did-resolver'

// `seed` must be a 32-byte long Uint8Array
async function createJWS(seed) {
  const provider = new Ed25519Provider(seed)
  const did = new DID({ provider, resolver: getResolver() })
  // Authenticate the DID with the provider
  await did.authenticate()
  // This will throw an error if the DID instance is not authenticated
  const jws = await did.createJWS({ hello: 'world' })
}
```

### Enable Ceramic transactions

```ts
import { CeramicClient } from '@ceramicnetwork/http-client'
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { getResolver } from 'key-did-resolver'

const ceramic = new CeramicClient()

// `seed` must be a 32-byte long Uint8Array
async function authenticateCeramic(seed) {
  const provider = new Ed25519Provider(seed)
  const did = new DID({ provider, resolver: getResolver() })
  // Authenticate the DID with the provider
  await did.authenticate()
  // The Ceramic client can create and update streams using the authenticated DID
  ceramic.did = did
}
```

### Resolve a DID document

```ts
import { DID } from 'dids'
import { getResolver } from 'key-did-resolver'

// See https://github.com/decentralized-identity/did-resolver
const did = new DID({ resolver: getResolver() })

// Resolve a DID document
await did.resolve('did:key:...')
```

### Store signed data on IPFS using DagJWS

The DagJWS functionality of the DID library can be used in conjunction with IPFS.

```ts
const payload = { some: 'data' }

// sign the payload as dag-jose
const { jws, linkedBlock } = await did.createDagJWS(payload)

// put the JWS into the ipfs dag
const jwsCid = await ipfs.dag.put(jws, {
  format: 'dag-jose',
  hashAlg: 'sha2-256',
})

// put the payload into the ipfs dag
const block = await ipfs.block.put(linkedBlock, { cid: jws.link })

// get the value of the payload using the payload cid
console.log((await ipfs.dag.get(jws.link)).value)
// output:
// > { some: 'data' }

// alternatively get it using the ipld path from the JWS cid
console.log((await ipfs.dag.get(jwsCid, { path: '/link' })).value)
// output:
// > { some: 'data' }

// get the jws from the dag
console.log((await ipfs.dag.get(jwsCid)).value)
// output:
// > {
// >   payload: 'AXESINDmZIeFXbbpBQWH1bXt7F2Ysg03pRcvzsvSc7vMNurc',
// >   signatures: [
// >     {
// >       protected: 'eyJraWQiOiJkaWQ6Mzp1bmRlZmluZWQ_dmVyc2lvbj0wI3NpZ25pbmciLCJhbGciOiJFUzI1NksifQ',
// >       signature: 'pNz3i10YMlv-BiVfqBbHvHQp5NH3x4TAHQ5oqSmNBUx1DH_MONa_VBZSP2o9r9epDdbRRBLQjrIeigdDWoXrBQ'
// >     }
// >   ],
// >   link: CID(bafyreigq4zsipbk5w3uqkbmh2w2633c5tcza2n5fc4x45s6soo54ynxk3q)
// > }
```

##### How it Works

As can be observed above, the createDagJWS method takes the payload, encodes it using dag-cbor, and computes its CID. It then uses this CID as the payload of the JWS that is then signed. The JWS that was just created can be put into ipfs using the dag-jose codec. Returned is also the encoded block of the payload. This can be put into ipfs using ipfs.block.put. Alternatively, ipfs.dag.put(payload) would have the same effect.

### Store encrypted data on IPFS with DagJWE

The DagJWE functionality allows us to encrypt IPLD data to one or multiple DIDs. The resulting JWE object can then be put into ipfs using the dag-jose codec. A user that is authenticated can at a later point decrypt this object.

```ts
const cleartext = { some: 'data', coolLink: new CID('bafyqacnbmrqxgzdgdeaui') }

// encrypt the cleartext object
const jwe = await did.createDagJWE(cleartext, [
  'did:3:bafy89h4f9...',
  'did:key:za234...',
])

// put the JWE into the ipfs dag
const jweCid = await ipfs.dag.put(jwe, {
  format: 'dag-jose',
  hashAlg: 'sha2-256',
})

// get the jwe from the dag and decrypt it
const dagJWE = await ipfs.dag.get(jweCid)
console.log(await did.decryptDagJWE(dagJWE))
// output:
// > { some: 'data' }
```

<!--
## A Note on Wallets

---

## A Note on Encryption and Privacy

---

## Guides

---

- [Choosing the right account type for your Ceramic project]()
- [How to store signed and encrypted data on IPFS (and Ceramic)]()

## Additional Resources

---

- [How encryption works on Ceramic]()
- [How to approach privacy and encryption on Ceramic]()
- [Meet DagJOSE: the decentralized linked-data format that powers Ceramic]()
- [EIP-2844: Ethereum Improvement Proposal for a standard DID interface]()
- [W3C: Decentralized Identifiers (DIDs) 1.0 Specification]()

## Next Steps

---

- To support transactions, you'll need to set up your DID provider for authentication.
--># Module: did-session

Manages user account DIDs in web based environments.

## Purpose

Manages, creates and authorizes a DID session key for a user. Returns an authenticated DIDs instance
to be used in other Ceramic libraries. Supports did:pkh for blockchain accounts with Sign-In with
Ethereum and CACAO for authorization.

## Installation

```sh
npm install did-session
```

## Usage

Authorize and use DIDs where needed. Import the AuthMethod you need, Ethereum accounts are used here for example.

```ts
import { DIDSession } from 'did-session'
import { EthereumWebAuth, getAccountId } from '@didtools/pkh-ethereum'

const ethProvider = // import/get your web3 eth provider
const addresses = await ethProvider.enable()
const accountId = await getAccountId(ethProvider, addresses[0])
const authMethod = await EthereumWebAuth.getAuthMethod(ethProvider, accountId)

const session = await DIDSession.authorize(authMethod, { resources: [...]})

// Uses DIDs in ceramic, combosedb & glaze libraries, ie
const ceramic = new CeramicClient()
ceramic.did = session.did

// pass ceramic instance where needed
```

You can serialize a session to store for later and then re-initialize. Currently sessions are valid
for 1 day by default.

```ts
// Create session as above, store for later
const session = await DIDSession.authorize(authMethod, { resources: [...]})
const sessionString = session.serialize()

// write/save session string where you want (ie localstorage)
// ...

// Later re initialize session
const session2 = await DIDSession.fromSession(sessionString)
const ceramic = new CeramicClient()
ceramic.did = session2.did
```

Additional helper functions are available to help you manage a session lifecycle and the user experience.

```ts
// Check if authorized or created from existing session string
didsession.hasSession

// Check if session expired
didsession.isExpired

// Get resources session is authorized for
didsession.authorizations

// Check number of seconds till expiration, may want to re auth user at a time before expiration
didsession.expiresInSecs
```

## Configuration

The resources your app needs to write access to must be passed during authorization. Resources are an array
of Model Stream Ids or Streams Ids. Typically you will just pass resources from `@composedb` libraries as
you will already manage your Composites and Models there. For example:

```ts
import { ComposeClient } from '@composedb/client'

//... Reference above and `@composedb` docs for additional configuration here

const client = new ComposeClient({ ceramic, definition })
const resources = client.resources
const session = await DIDSession.authorize(authMethod, { resources })
client.setDID(session.did)
```

By default a session will expire in 1 day. You can change this time by passing the `expiresInSecs` option to
indicate how many seconds from the current time you want this session to expire.

```ts
const oneWeek = 60 * 60 * 24 * 7
const session = await DIDSession.authorize(authMethod, { resources: [...], expiresInSecs: oneWeek })
```

A domain/app name is used when making requests, by default in a browser based environment the library will use
the domain name of your app. If you are using the library in a non web based environment you will need to pass
the `domain` option otherwise an error will thrown.

```ts
const session = await DIDSession.authorize(authMethod, { resources: [...], domain: 'YourAppName' })
```

## Typical usage pattern

A typical pattern is to store a serialized session in local storage and load on use if available. Then
check that a session is still valid before making writes.

**Warning:** LocalStorage is used for illustrative purposes here and may not be best for your app, as
there is a number of known issues with storing secret material in browser storage. The session string
allows anyone with access to that string to make writes for that user for the time and resources that
session is valid for. How that session string is stored and managed is the responsibility of the application.

```ts
import { DIDSession } from 'did-session'
import type { AuthMethod } from '@didtools/cacao'
import { EthereumWebAuth, getAccountId } from '@didtools/pkh-ethereum'

const ethProvider = // import/get your web3 eth provider
const addresses = await ethProvider.enable()
const accountId = await getAccountId(ethProvider, addresses[0])
const authMethod = await EthereumWebAuth.getAuthMethod(ethProvider, accountId)

const loadSession = async(authMethod: AuthMethod):Promise<DIDSession> => {
  const sessionStr = localStorage.getItem('didsession')
  let session

  if (sessionStr) {
    session = await DIDSession.fromSession(sessionStr)
  }

  if (!session || (session.hasSession && session.isExpired)) {
    session = await DIDSession.authorize(authMethod, { resources: [...]})
    localStorage.setItem('didsession', session.serialize())
  }

  return session
}

const session = await loadSession(authMethod)
const ceramic = new CeramicClient()
ceramic.did = session.did

// pass ceramic instance where needed, ie ceramic, composedb, glaze
// ...

// before ceramic writes, check if session is still valid, if expired, create new
if (session.isExpired) {
  const session = loadSession(authMethod)
  ceramic.did = session.did
}

// continue to write
```

## Upgrading from `did-session@0.x.x` to `did-session@1.x.x`

AuthProviders change to AuthMethod interfaces. Similarly you can import the auth libraries you need. How you configure and manage
these AuthMethods may differ, but each will return an AuthMethod function to be used with did-session.

```ts
// Before with v0.x.x
//...
import { EthereumAuthProvider } from '@ceramicnetwork/blockchain-utils-linking'

const ethProvider = // import/get your web3 eth provider
const addresses = await ethProvider.enable()
const authProvider = new EthereumAuthProvider(ethProvider, addresses[0])
const session = new DIDSession({ authProvider })
const did = await session.authorize()

// Now did-session@1.0.0
...
import { EthereumWebAuth, getAccountId } from '@didtools/pkh-ethereum'

const ethProvider = // import/get your web3 eth provider
const addresses = await ethProvider.enable()
const accountId = await getAccountId(ethProvider, addresses[0])
const authMethod = await EthereumWebAuth.getAuthMethod(ethProvider, accountId)
const session = await DIDSession.authorize(authMethod, { resources: [...]})
const did = session.did
```

## Upgrading from `@glazed/did-session` to `did-session`

`authorize` changes to a static method which returns a did-session instance and `getDID()` becomes a `did` getter. For example:

```ts
// Before @glazed/did-session
const session = new DIDSession({ authProvider })
const did = await session.authorize()

// Now did-session
const session = await DIDSession.authorize(authMethod, { resources: [...]})
const did = session.did
```

Requesting resources are required now when authorizing, before wildcard (access all) was the default. You can continue to use
wildcard by passing the following _ below. Wildcard is typically only used with `@glazed` libraries and/or tile documents and
it is best to switch over when possible, as the wildcard option may be _ deprecated in the future. When using with
composites/models you should request the minimum needed resources instead.

```ts
const session = await DIDSession.authorize(authMethod, { resources: [`ceramic://*`] })
const did = session.did
```

# Class: DIDSession

## Constructors

### constructor

• **new DIDSession**(`params`)

#### Parameters

| Name     | Type            |
| :------- | :-------------- |
| `params` | `SessionParams` |

## Accessors

### authorizations

• `get` **authorizations**(): `string`[]

Get the list of resources a session is authorized for

#### Returns

`string`[]

---

### cacao

• `get` **cacao**(): `Cacao`

Get the session CACAO

#### Returns

`Cacao`

---

### did

• `get` **did**(): `DID`

Get DID instance, if authorized

#### Returns

`DID`

---

### expireInSecs

• `get` **expireInSecs**(): `number`

Number of seconds until a session expires

#### Returns

`number`

---

### hasSession

• `get` **hasSession**(): `boolean`

#### Returns

`boolean`

---

### id

• `get` **id**(): `string`

DID string associated to the session instance. session.id == session.getDID().parent

#### Returns

`string`

---

### isExpired

• `get` **isExpired**(): `boolean`

Determine if a session is expired or not

#### Returns

`boolean`

## Methods

### isAuthorized

▸ **isAuthorized**(`resources?`): `boolean`

Determine if session is available and optionally if authorized for given resources

#### Parameters

| Name         | Type       |
| :----------- | :--------- |
| `resources?` | `string`[] |

#### Returns

`boolean`

---

### serialize

▸ **serialize**(): `string`

Serialize session into string, can store and initialize the same session again while valid

#### Returns

`string`

---

### authorize

▸ `Static` **authorize**(`authMethod`, `authOpts?`): `Promise`\<`DIDSession`\>

Request authorization for session

#### Parameters

| Name         | Type         |
| :----------- | :----------- |
| `authMethod` | `AuthMethod` |
| `authOpts`   | `AuthOpts`   |

#### Returns

`Promise`\<`DIDSession`\>

---

### fromSession

▸ `Static` **fromSession**(`session`): `Promise`\<`DIDSession`\>

Initialize a session from a serialized session string

#### Parameters

| Name      | Type     |
| :-------- | :------- |
| `session` | `string` |

#### Returns

`Promise`\<`DIDSession`\>

---

### initDID

▸ `Static` **initDID**(`didKey`, `cacao`): `Promise`\<`DID`\>

#### Parameters

| Name     | Type    |
| :------- | :------ |
| `didKey` | `DID`   |
| `cacao`  | `Cacao` |

#### Returns

`Promise`\<`DID`\>
# Key DID libraries

---

The Key DID libraries include the [resolver](#key-did-resolver) and [multiple providers](#key-did-providers) to provide a simple way for developers to get started using the [DID client](./did-jsonrpc.md) with the `did:key` method.

## Available libraries

---

- The [Key DID resolver](#key-did-resolver) allows a DID JSON-RPC client to resolve accounts using the `did:key` method
- The [Key DID provider ED25519](#key-did-provider-ed25519) allows applications to create and use Key DID accounts for ED25519 keypairs. This provider supports encryption.
- The [Key DID provider secp256k1](#key-did-provider-secp256k1) allows applications to create and use Key DID accounts for secp256k1 keypairs. This provider does not supports encryption.

## Key DID resolver

---

The `key-did-resolver` module is needed to resolve DID documents using the `did:key` method.

### Installation

```sh
npm install key-did-resolver
```

### Usage

```ts
import { DID } from 'dids'
import { getResolver } from 'key-did-resolver'

async function resolveDID() {
  const did = new DID({ resolver: getResolver() })
  return await did.resolve('did:key:...')
}
```

## Key DID providers

---

Different libraries implement a provider for the `did:key` method based on different cryptographic primitives. These providers may have different possibilities, for example `key-did-provider-ed25519` supports encryption while `key-did-provider-secp256k1` does not.

## Key DID provider ED25519

---

This is the **recommended provider** for the `key:did` method in most cases.

### Installation

```sh
npm install key-did-provider-ed25519
```

### Usage

```ts
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { getResolver } from 'key-did-resolver'

// `seed` must be a 32-byte long Uint8Array
async function authenticateDID(seed) {
  const provider = new Ed25519Provider(seed)
  const did = new DID({ provider, resolver: getResolver() })
  await did.authenticate()
  return did
}
```

## Key DID provider secp256k1

---

This provider *does not support encryption*, so using methods such as `createJWE` on the `DID` instance is not supported.

### Installation

```sh
npm install key-did-provider-secp256k1
```

### Usage

```ts
import { DID } from 'dids'
import { Secp256k1Provider } from 'key-did-provider-secp256k1'
import { getResolver } from 'key-did-resolver'

// `seed` must be a 32-byte long Uint8Array
async function authenticateDID(seed) {
  const provider = new Secp256k1Provider(seed)
  const did = new DID({ provider, resolver: getResolver() })
  await did.authenticate()
  return did
}
```# Clients

### Ceramic clients

Ceramic clients are libraries that allow your application to communicate with a Ceramic node. Different clients may choose to implement different high-level, language-specific developer APIs. Before submitting requests to a Ceramic node, clients translate those API calls into the standard [Ceramic HTTP API](./javascript-clients/ceramic-http.md), which it uses to actually communicate with a Ceramic node.

### Account clients

Account clients are libraries that allow your application to recognize users, authenticate, and perform other account-related functionality such as signing transactions and encrypting data.

## Available clients

---

When building with Ceramic clients, be sure to install both a Ceramic client and an account client.

### [**JS Ceramic HTTP Client →**](./javascript-clients/ceramic-http.md)

The Ceramic JS HTTP client is a Ceramic client that can be used in browsers and Node.js environments to connect your application to a Ceramic node. It is actively maintained by 3Box Labs and supports the latest Ceramic features. This is the recommended Ceramic client to build with for most applications.

<!-- ### [**JS Ceramic Core Client →**]()

The Ceramic JS Core client is a Ceramic client that can be used in Node.js environments and includes a local Ceramic node. It is actively maintained by 3Box Labs and supports the latest Ceramic features. This is the recommended Ceramic client to use in test environments and other places where you can directly run a Ceramic node, but is not recommended for web applications. -->

### [DID JSON-RPC Client →](./authentication/did-jsonrpc.md)

The DID JSON-RPC Client is an account client that provides a simple JS API for interacting with Ceramic accounts. It is actively maintained by 3Box Labs and supports all account types.# Ceramic HTTP client

The Ceramic HTTP client library can be used in browsers and Node.js to connect your application to a Ceramic node. It is actively maintained and supports the latest Ceramic features.

![Verse](/img/verse.png)

## Things to know


- The client is read-only by default, to enable transactions a [DID client](../authentication//did-jsonrpc.md) needs to be attached to the Ceramic client instance.
- Ceramic streams can be identified by a **stream ID** or a **commit ID**. A **stream ID** is generated when creating the stream and can be used to load the **latest version** of the stream, while a **commit ID** represents a **specific version** of the stream.

## Installation

```bash
npm install @ceramicnetwork/http-client
```

<!--
## Common options

TODO: describe options common to multiple methods and stream programs

### `anchor`

### `pin`

### `publish`
-->

## Common use-cases

### Load a single stream

```ts
// Import the client
import { CeramicClient } from '@ceramicnetwork/http-client'

// Connect to a Ceramic node
const ceramic = new CeramicClient('https://your-ceramic-node.com')

// The `id` argument can be a stream ID (to load the latest version)
// or a commit ID (to load a specific version)
async function load(id) {
  return await ceramic.loadStream(id)
}
```

### Load multiple streams

Rather than using the `loadStream` method multiple times with `Promise.all()` to load multiple streams at once, a **more efficient way for loading multiple streams** is to use the `multiQuery` method.

```ts
// Import the client
import { CeramicClient } from '@ceramicnetwork/http-client'

// Connect to a Ceramic node
const ceramic = new CeramicClient('https://your-ceramic-node.com')

// The `ids` argument can contain an array of stream IDs (to load the latest version)
// or commit IDs (to load a specific version)
async function loadMulti(ids = []) {
  const queries = ids.map((streamId) => ({ streamId }))
  // This will return an Object of stream ID keys to stream values
  return await ceramic.multiQuery(queries)
}
```

### Enable transactions

In order to create and update streams, the Ceramic client instance must be able to sign transaction payloads by using an authenticated DID instance. The [DID client documentation](../authentication//did-jsonrpc.md) describes the process of authenticating and attaching a DID instance to the Ceramic instance.

# Ceramic HTTP API

---

The Ceramic HTTP API is the standard lowest-level communication protocol between
clients and nodes on the Ceramic network. It allows client applications to
manually make REST HTTP requests to a remote Ceramic node to send transactons,
retrieve data, and "pin" data to make it available.

If you are building an application, you will usually interact with Ceramic using
a client API, such as the
[JS HTTP Client](./ceramic-http).

## When to use the HTTP API

---

The HTTP API is useful if you have a special use case where you directly want to
make manual HTTP requests, or you want to implement an HTTP client in a new
language.

:::caution

**Gateway mode**

    Some HTTP API methods will not be available if the Ceramic node you are using runs in *gateway mode*. This option disables writes, which is useful when exposing your node to the internet. **API methods that are disabled when running in gateway mode will be clearly marked.**

:::

## Streams API

The `stream` endpoint is used to create new streams and load streams from the
node using a StreamID or genesis content.

### Loading a stream

Load the state of a stream given its StreamID.

=== "Request"

    ```
    GET /api/v0/streams/:streamid
    ```

    Here, `:streamid` should be replaced by the StreamID of the stream that is being requested.

=== "Response" The response body contains the following fields:

    - `streamId` - the StreamID of the requested stream as string
    - `state` - the state of the requested stream as [StreamState](https://developers.ceramic.network/reference/typescript/interfaces/_ceramicnetwork_common.StreamState.html)

#### Example

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/streams/kjzl6cwe1jw147r7878h32yazawcll6bxe5v92348cxitif6cota91qp68grbhm
    ```

=== "Response"

    ```bash
    {
      "streamId": "kjzl6cwe1jw147r7878h32yazawcll6bxe5v92348cxitif6cota91qp68grbhm",
      "state": {
        "type": 0,
        "content": {
          "Ceramic": "pottery"
        },
        "metadata": {
          "schema": null,
          "controllers": [
            "did:key:z6MkfZ6S4NVVTEuts8o5xFzRMR8eC6Y1bngoBQNnXiCvhH8H"
          ]
        },
        "signature": 2,
        "anchorStatus": "PENDING",
        "log": [{
          "cid": "bagcqceramof2xi7kh6qblirzkbc7yulcjcticlcob6uvdrx3bexgks37ilva",
          "type": 0
        }],
        "anchorScheduledFor": "12/15/2020, 2:45:00 PM"
      }
    }
    ```

### Creating a Stream

:::note
**Disabled in gateway mode**
:::

Create a new stream, or load a stream from its genesis content. The genesis
content may be signed, or unsigned in some cases.

=== "Request"

    ```bash
    POST /api/v0/streams
    ```

    #### Request body fields:

    - `type` - the type code of the StreamType to use. Type codes for the supported stream types can be found [in this table](https://github.com/ceramicnetwork/CIPs/blob/main/tables/streamtypes.csv).
    - `genesis` - the genesis content of the stream (will differ per StreamType)
    - `opts` - options for the stream creation, [CreateOpts](https://developers.ceramic.network/reference/typescript/interfaces/_ceramicnetwork_common.CreateOpts.html) (optional)

=== "Response"

    The response body contains the following fields:

    - `streamId` - the StreamID of the requested stream as string
    - `state` - the state of the requested stream as [StreamState](https://developers.ceramic.network/reference/typescript/interfaces/_ceramicnetwork_common.StreamState.html)

#### **Example**

This example creates a `TileDocument` from an unsigned genesis commit. Note that
if the content is defined for a `TileDocument` genesis commit, it needs to be
signed.

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/streams -X POST -d '{
        "type": 0,
        "genesis": {
          "header": {
            "family": "test",
            "controllers": ["did:key:z6MkfZ6S4NVVTEuts8o5xFzRMR8eC6Y1bngoBQNnXiCvhH8H"]
          }
        }
      }' -H "Content-Type: application/json"
    ```

=== "Response"

    ```bash
    {
      "streamId": "k2t6wyfsu4pg2qvoorchoj23e8hf3eiis4w7bucllxkmlk91sjgluuag5syphl",
      "state": {
        "type": 0,
        "content": {},
        "metadata": {
          "family": "test",
          "controllers": [
            "did:key:z6MkfZ6S4NVVTEuts8o5xFzRMR8eC6Y1bngoBQNnXiCvhH8H"
          ]
        },
        "signature": 0,
        "anchorStatus": "PENDING",
        "log": [
          {
            "cid": "bafyreihtdxfb6cpcvomm2c2elm3re2onqaix6frq4nbg45eaqszh5mifre",
            "type": 0
          }
        ],
        "anchorScheduledFor": "12/15/2020, 3:00:00 PM"
      }
    }
    ```

## Multiqueries API

The `multiqueries` endpoint enables querying multiple streams at once, as well
as querying streams which are linked.

### Querying multiple streams

This endpoint allows you to query multiple StreamIDs. Along with each StreamID
an array of paths can be passed. If any of the paths within the stream structure
contains a Ceramic StreamID url (`ceramic://<StreamID>`), this linked stream
will also be returned as part of the response.

=== "Request"

    ```bash
    POST /api/v0/multiqueries
    ```

    #### Request body fields:
    - `queries` - an array of [MultiQuery](https://developers.ceramic.network/reference/typescript/interfaces/_ceramicnetwork_common.MultiQuery.html) objects

=== "Response"

    The response body contains a map from StreamID strings to [StreamState](https://developers.ceramic.network/reference/typescript/interfaces/_ceramicnetwork_common.StreamState.html) objects.

#### Example

First let's create three streams to query using the Ceramic cli:

=== "Request1"

    ```bash
    ceramic create tile --content '{ "Document": "A" }'
    ```

=== "Response1"

    ```bash
    StreamID(kjzl6cwe1jw149rledowj0zi0icd7epi9y1m5tx4pardt1w6dzcxvr6bohi8ejc)
    {
      "Document": "A"
    }
    ```

=== "Request2"

    ```bash
    ceramic create tile --content '{ "Document": "B" }'
    ```

=== "Response2"

    ```bash
    StreamID(kjzl6cwe1jw147w3xz3xrcd37chh2rz4dfra3imtnsni385rfyqa3hbx42qwal0)
    {
      "Document": "B"
    }
    ```

=== "Request3"

    ```bash
    ceramic create tile --content '{
        "Document": "C",
        "link": "ceramic://kjzl6cwe1jw149rledowj0zi0icd7epi9y1m5tx4pardt1w6dzcxvr6bohi8ejc"
    }'
    ```

=== "Response3"

    ```bash
    StreamID(kjzl6cwe1jw14b54pb10voc4bqh73qyu8o6cfu66hoi3feidbbj81i5rohh7kgl)
    {
      "link": "ceramic://kjzl6cwe1jw149rledowj0zi0icd7epi9y1m5tx4pardt1w6dzcxvr6bohi8ejc",
      "Document": "C"
    }
    ```

Now let's query them though the multiqueries endpoint:

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/multiqueries -X POST -d '{
      "queries": [{
        "streamId": "kjzl6cwe1jw14b54pb10voc4bqh73qyu8o6cfu66hoi3feidbbj81i5rohh7kgl",
        "paths": ["link"]
      }, {
        "streamId": "kjzl6cwe1jw147w3xz3xrcd37chh2rz4dfra3imtnsni385rfyqa3hbx42qwal0",
        "paths": []
      }]
    }' -H "Content-Type: application/json"
    ```

=== "Response"

    ```bash
    {
      "kjzl6cwe1jw14b54pb10voc4bqh73qyu8o6cfu66hoi3feidbbj81i5rohh7kgl": {
        "type": 0,
        "content": {
          "link": "ceramic://kjzl6cwe1jw149rledowj0zi0icd7epi9y1m5tx4pardt1w6dzcxvr6bohi8ejc",
          "Document": "C"
        },
        "metadata": {
          "schema": null,
          "controllers": [
            "did:key:z6MkfZ6S4NVVTEuts8o5xFzRMR8eC6Y1bngoBQNnXiCvhH8H"
          ]
        },
        "signature": 2,
        "anchorStatus": "PENDING",
        "log": [
          {
            "cid": "bagcqcera5nx45nccxvjjyxsq3so5po77kpqzbfsydy6yflnkt6p5tnjvhbkq",
            "type": 0
          }
        ],
        "anchorScheduledFor": "12/30/2020, 1:45:00 PM"
      },
      "kjzl6cwe1jw149rledowj0zi0icd7epi9y1m5tx4pardt1w6dzcxvr6bohi8ejc": {
        "type": 0,
        "content": {
          "Document": "A"
        },
        "metadata": {
          "schema": null,
          "controllers": [
            "did:key:z6MkfZ6S4NVVTEuts8o5xFzRMR8eC6Y1bngoBQNnXiCvhH8H"
          ]
        },
        "signature": 2,
        "anchorStatus": "PENDING",
        "log": [
          {
            "cid": "bagcqcerawq5h7otlkdwuai7vhogqhs2aeaauwbu2aqclrh4iyu5h54qqogma",
            "type": 0
          }
        ],
        "anchorScheduledFor": "12/30/2020, 1:45:00 PM"
      },
      "kjzl6cwe1jw147w3xz3xrcd37chh2rz4dfra3imtnsni385rfyqa3hbx42qwal0": {
        "type": 0,
        "content": {
          "Document": "B"
        },
        "metadata": {
          "schema": null,
          "controllers": [
            "did:key:z6MkfZ6S4NVVTEuts8o5xFzRMR8eC6Y1bngoBQNnXiCvhH8H"
          ]
        },
        "signature": 2,
        "anchorStatus": "PENDING",
        "log": [
          {
            "cid": "bagcqceranecdjzw4xheudgkr2amjkntpktci2xv44d7v4hbft3ndpptid6ka",
            "type": 0
          }
        ],
        "anchorScheduledFor": "12/30/2020, 1:45:00 PM"
      }
    }
    ```

## **Commits API**

The `commits` endpoint provides lower level access to the data structure of a
Ceramic stream. It is also the endpoint that is used in order to update a stream,
by adding a new commit.

### Getting all commits in a stream

By calling GET on the _commits_ endpoint along with a StreamID gives you access
to all of the commits of the given stream. This is useful if you want to inspect
the stream history, or apply all of the commits to a Ceramic node that is not
connected to the network.

=== "Request"

    ```bash
    GET /api/v0/commits/:streamid
    ```

    Here, `:streamid` should be replaced by the string representation of the StreamID of the stream that is being requested.

=== "Response"

    * `streamId` - the StreamID of the requested stream, string
    * `commits` - an array of commit objects

#### Example

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/commits/kjzl6cwe1jw14ahmwunhk9yjwawac12tb52j1uj3b9a57eohmhycec8778p3syv
    ```

=== "Response"

    ```bash
    {
      "streamId": "kjzl6cwe1jw14ahmwunhk9yjwawac12tb52j1uj3b9a57eohmhycec8778p3syv",
      "commits": [
        {
          "cid": "bagcqcera2faj5vik2giftqxftbngfndkci7x4z5vp3psrf4flcptgkz5xztq",
          "value": {
            "jws": {
              "payload": "AXESIAsUBpZMnue1yQ0BgXsjOFyN0cHq6AgspXnI7qGB54ux",
              "signatures": [
                {
                  "signature": "16tBnfkXQU0yo-RZvfjWhm7pP-hIxJ5m-FIMHlCrRkpjbleoEcaC80Xt7qs_WZOlOCexznjow9aX4aZe51cYCQ",
                  "protected": "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa2ZaNlM0TlZWVEV1dHM4bzV4RnpSTVI4ZUM2WTFibmdvQlFOblhpQ3ZoSDhII3o2TWtmWjZTNE5WVlRFdXRzOG81eEZ6Uk1SOGVDNlkxYm5nb0JRTm5YaUN2aEg4SCJ9"
                }
              ],
              "link": "bafyreialcqdjmte64624sdibqf5sgoc4rxi4d2xibawkk6oi52qydz4lwe"
            },
            "linkedBlock": "o2RkYXRhoWV0aXRsZXFNeSBmaXJzdCBEb2N1bWVudGZoZWFkZXKiZnNjaGVtYfZrY29udHJvbGxlcnOBeDhkaWQ6a2V5Ono2TWtmWjZTNE5WVlRFdXRzOG81eEZ6Uk1SOGVDNlkxYm5nb0JRTm5YaUN2aEg4SGZ1bmlxdWVwenh0b1A5blphdVgxcEE0OQ"
          }
        },
        {
          "cid": "bagcqcera3fkje7je4lvctkam4fvi675avtcuqgrv7dn6aoqljd5lebpl7rfq",
          "value": {
            "jws": {
              "payload": "AXESINm6lI30m3j5H2ausx-ulXj-L9CmFlOTZBZvJ2O734Zt",
              "signatures": [
                {
                  "signature": "zsLJbBSU5xZTQkYlXwEH9xj_t_8frvSFCYs0SlVMPXOnw8zOJOsKnJDQlUOvPJxjt8Bdc_7xoBdmcRG1J1tpCw",
                  "protected": "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa2ZaNlM0TlZWVEV1dHM4bzV4RnpSTVI4ZUM2WTFibmdvQlFOblhpQ3ZoSDhII3o2TWtmWjZTNE5WVlRFdXRzOG81eEZ6Uk1SOGVDNlkxYm5nb0JRTm5YaUN2aEg4SCJ9"
                }
              ],
              "link": "bafyreigzxkki35e3pd4r6zvowmp25fly7yx5bjqwkojwiftpe5r3xx4gnu"
            },
            "linkedBlock": "pGJpZNgqWCYAAYUBEiDRQJ7VCtGQWcLlmFpitGoSP35ntX7fKJeFWJ8zKz2+Z2RkYXRhgaNib3BjYWRkZHBhdGhlL21vcmVldmFsdWUY6mRwcmV22CpYJgABhQESINFAntUK0ZBZwuWYWmK0ahI/fme1ft8ol4VYnzMrPb5nZmhlYWRlcqFrY29udHJvbGxlcnOA"
          }
        }
      ]
    }
    ```

### Applying a new commit to stream

:::note
**Disabled in gateway mode**
:::

In order to modify a stream we apply a commit to its log. This commit usually
contains a signature over a _json-patch_ diff describing a modification to the
stream contents. The commit also needs to contain pointers to the previous
commit and other metadata. You can read more about this in the
[Ceramic Specification](https://github.com/ceramicnetwork/.github/blob/main/LEGACY_SPECIFICATION.md).
Different stream types may have different formats for their commits. If you want
to see an example implementation for how to construct a commit you can have a
look at the implementation of the TileDocument.

=== "Request"

    ```bash
    POST /api/v0/commits
    ```

    #### Request body fields:

    - `streamId` - the StreamID of the stream to apply the commit to, string
    - `commit` - the content of the commit to apply (will differ per streamtype)
    - `opts` - options for the stream update [UpdateOpts](https://developers.ceramic.network/reference/typescript/interfaces/_ceramicnetwork_common.UpdateOpts.html) (optional)

=== "Response"

    * `streamId` - the StreamID of the stream that was modified
    * `state` - the new state of the stream that was modified, [StreamState](https://developers.ceramic.network/reference/typescript/interfaces/_ceramicnetwork_common.StreamState.html)

#### Example

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/commits -X POST -d '{
      "streamId": "kjzl6cwe1jw14ahmwunhk9yjwawac12tb52j1uj3b9a57eohmhycec8778p3syv",
      "commit": {
        "jws": {
          "payload": "AXESINm6lI30m3j5H2ausx-ulXj-L9CmFlOTZBZvJ2O734Zt",
          "signatures": [
            {
              "signature": "zsLJbBSU5xZTQkYlXwEH9xj_t_8frvSFCYs0SlVMPXOnw8zOJOsKnJDQlUOvPJxjt8Bdc_7xoBdmcRG1J1tpCw",
              "protected": "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa2ZaNlM0TlZWVEV1dHM4bzV4RnpSTVI4ZUM2WTFibmdvQlFOblhpQ3ZoSDhII3o2TWtmWjZTNE5WVlRFdXRzOG81eEZ6Uk1SOGVDNlkxYm5nb0JRTm5YaUN2aEg4SCJ9"
            }
          ],
          "link": "bafyreigzxkki35e3pd4r6zvowmp25fly7yx5bjqwkojwiftpe5r3xx4gnu"
        },
        "linkedBlock": "pGJpZNgqWCYAAYUBEiDRQJ7VCtGQWcLlmFpitGoSP35ntX7fKJeFWJ8zKz2+Z2RkYXRhgaNib3BjYWRkZHBhdGhlL21vcmVldmFsdWUY6mRwcmV22CpYJgABhQESINFAntUK0ZBZwuWYWmK0ahI/fme1ft8ol4VYnzMrPb5nZmhlYWRlcqFrY29udHJvbGxlcnOA"
      }
    }' -H "Content-Type: application/json"
    ```

=== "Response"

    ```bash
    {
      "streamId": "kjzl6cwe1jw14ahmwunhk9yjwawac12tb52j1uj3b9a57eohmhycec8778p3syv",
      "state": {
        "type": 0,
        "content": {
          "title": "My first Document"
        },
        "metadata": {
          "schema": null,
          "controllers": [
            "did:key:z6MkfZ6S4NVVTEuts8o5xFzRMR8eC6Y1bngoBQNnXiCvhH8H"
          ]
        },
        "signature": 2,
        "anchorStatus": "PENDING",
        "log": [
          {
            "cid": "bagcqcera2faj5vik2giftqxftbngfndkci7x4z5vp3psrf4flcptgkz5xztq",
            "type": 0
          },
          {
            "cid": "bagcqcera3fkje7je4lvctkam4fvi675avtcuqgrv7dn6aoqljd5lebpl7rfq",
            "type": 1
          }
        ],
        "anchorScheduledFor": "12/30/2020, 1:15:00 PM",
        "next": {
          "content": {
            "title": "My first Document",
            "more": 234
          },
          "metadata": {
            "schema": null,
            "controllers": []
          }
        }
      }
    }
    ```

## Pins API

The `pins` api endpoint can be used to manipulate the pinset. The pinset is all
of the streams that a node maintains the state of. Any stream opened by the node
that is not pinned will eventually be garbage collected from the node.

### Adding to pinset

:::note
**Disabled in gateway mode**
:::

This method adds the stream with the given StreamID to the pinset.

=== "Request"

    ```bash
    POST /api/v0/pins/:streamid
    ```

    Here, `:streamid` should be replaced by the string representation of the StreamID of the stream that is being requested.

=== "Response"

    If the operation was successful the response will be a 200 OK.

    * `streamId` - the StreamID of the stream which was pinned, string

#### Example

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/pins/k2t6wyfsu4pg2qvoorchoj23e8hf3eiis4w7bucllxkmlk91sjgluuag5syphl -X POST
    ```

=== "Response"

    ```bash
    {
      "streamId": "k2t6wyfsu4pg2qvoorchoj23e8hf3eiis4w7bucllxkmlk91sjgluuag5syphl"
    }
    ```

### Removing from pinset

:::note
**Disabled in gateway mode**
:::

This method removes the stream with the given StreamID from the pinset.

=== "Request"

    ```bash
    DELETE /api/v0/pins/:streamid
    ```

    Here, `:streamid` should be replaced by the string representation of the StreamID of the stream that is being requested.

=== "Response"

    If the operation was successful the response will be a 200 OK.

    * `streamId` - the StreamID of the stream which was unpinned, string

#### Example

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/pins/k2t6wyfsu4pg2qvoorchoj23e8hf3eiis4w7bucllxkmlk91sjgluuag5syphl -X DELETE
    ```

=== "Response"

    ```bash
    {
      "streamId": "k2t6wyfsu4pg2qvoorchoj23e8hf3eiis4w7bucllxkmlk91sjgluuag5syphl"
    }
    ```

### Listing streams in pinset

Calling this method allows you to list all of the streams that are in the pinset
on this node.

=== "Request"

    ```bash
    GET /api/v0/pins
    ```

=== "Response"

    * `pinnedStreamIds` - an array of StreamID strings that are in the pinset

#### Example

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/pins
    ```

=== "Response"

    ```bash
    {
      "pinnedStreamIds": [
        "k2t6wyfsu4pfwqaju0w9nmi53zo6f5bcier7vc951x4b9rydv6t8q4pvzd5w3l",
        "k2t6wyfsu4pfxon8reod8xcyka9bujeg7acpz8hgh0jsyc7p2b334izdyzsdp7",
        "k2t6wyfsu4pfxqseec01fnqywmn8l93p4g2chzyx3sod3hpyovurye9hskcegs",
        "k2t6wyfsu4pfya9y0ega1vnokf0g5qaus69basy52oxg50y3l35vm9rqbb88t3"
      ]
    }
    ```

### Checking inclusion in pinset

This method is used to check if a particular stream is in the pinset.

=== "Request"

    ```bash
    GET /api/v0/pins/:streamid
    ```

    Here, `:streamid` should be replaced by the string representation of the StreamID of the stream that is being requested.

=== "Response"

    * `pinnedStreamIds` - an array containing the specified StreamID string if that stream is pinned, or an empty array if that stream is not pinned

#### Example

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/pins/k2t6wyfsu4pg2qvoorchoj23e8hf3eiis4w7bucllxkmlk91sjgluuag5syphl
    ```

=== "Response"

    ```bash
    {
      "pinnedStreamIds": ["k2t6wyfsu4pg2qvoorchoj23e8hf3eiis4w7bucllxkmlk91sjgluuag5syphl"]
    }
    ```

## Node Info APIs

The methods under the `/node` path provides more information about this
particular node.

### Supported blockchains for anchoring

Get all of the
[CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md)
_chainIds_ supported by this node.

=== "Request"

    ```bash
    GET /api/v0/node/chains
    ```

=== "Response"

    The response body contains the following fields:

    - `supportedChains` - and array with [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md) formatted chainIds

#### Example

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/node/chains
    ```

=== "Response"

    ```bash
    {
      "supportedChains": ["eip155:3"]
    }
    ```

### Health check

Check the health of the node and the machine it's running on. Run
`ceramic daemon -h` for more details on how this can be configured.

=== "Request"

    ```bash
    GET /api/v0/node/healthcheck
    ```

=== "Response"

    Either a `200` response with the text `Alive!`, or a `503` with the text `Insufficient resources`.

#### Example

=== "Request"

    ```bash
    curl http://localhost:7007/api/v0/node/healthcheck
    ```

=== "Response"

    ```bash
    Alive!
    ```

### Node status

The node status endpoint exposes information about the node's status.

:::note
**Admin DID required**
:::

Access to this endpoint is restricted to admin DIDs, the request headers need to
contain a signature for the request. The recommended way to interact with this
endpoint is using the CLI with the `ceramic status` command.

=== "Request"

    ```bash
    GET /api/v0/admin/status
    ```

=== "Response"

    Either a `200` response with the JSON payload, or a server error.

#### Example

=== "Command"

    ```bash
    ceramic status
    ```

=== "Response"

    ```json
    {
      "runId": "7647439f-44fa-4aff-b3c8-b7e16015c52e",
      "uptimeMs": 27638,
      "network": "inmemory",
      "anchor": {
        "anchorServiceUrl": "<inmemory>",
        "ethereumRpcEndpoint": null,
        "chainId": "inmemory:12345"
      },
      "ipfs": {
        "peerId": "12D3KooWRzv8fM4oV6jRj8nsg8kxo3Z9u26vVXLaUKiLbuoV3Vtp",
        "addresses": [
          "/ip4/127.0.0.1/tcp/4011/p2p/12D3KooWRzv8fM4oV6jRj8nsg8kxo3Z9u26vVXLaUKiLbuoV3Vtp",
          "/ip4/192.168.0.101/tcp/4011/p2p/12D3KooWRzv8fM4oV6jRj8nsg8kxo3Z9u26vVXLaUKiLbuoV3Vtp"
        ]
      },
      "composeDB": {
        "indexedModels": []
      }
    }
    ```# Pinning

Pinning allows you to persist and make streams available on a Ceramic node beyond a single session. This guide demonstrates how to add and remove streams from your node's pinset, and how to list the streams currently in the pinset. In order to interact with a pinset, you must have [installed a Ceramic client](./ceramic-http.md).

## Overview

By default Ceramic will garbage collect any stream that has been written or [queried](./queries.md) on your node after some period of time. In order to prevent the loss of streams due to garbage collection, you need to explicitly pin the streams that you wish to persist. Pinning instructs the node to keep them around in persistent storage until they are explicitly unpinned.

## **Pin a stream while creating it**

Most StreamTypes will allow you to request that a Stream be pinned at the same time that you create the Stream. An example using the TileDocument Streamtype is below:

```javascript
await TileDocument.create(ceramic, content, null, { pin: true })
```

## **Add to pinset**

Use the `pin.add()` method to add an existing stream to your permanent pinset.

```javascript
const streamId = 'kjzl6cwe1jw14...'
await ceramic.admin.pin.add(streamId)
```


## **Remove from pinset**

Use the `pin.rm()` method to remove a stream from your permanent pinset.

```javascript
const streamId = 'kjzl6cwe1jw14...'
await ceramic.admin.pin.rm(streamId)
```


## **List streams in pinset**

Use the `pin.ls()` method to list streams currently in your permanent pinset.

```javascript
const streamIds = await ceramic.admin.pin.ls()
```

# Queries

This guide demonstrates how to query streams during runtime using the [JS HTTP](./ceramic-http.md) and JS Core clients.

## **Requirements**

You need to have an [installed client](./ceramic-http.md) to perform queries during runtime.

## **Query a stream**

Use the `loadStream()` method to load a single stream using its _StreamID_.

```javascript
const streamId = 'kjzl6cwe1jw14...'
const stream = await ceramic.loadStream(streamId)
```

:::caution 

    When using the Typescript APIs, `loadStream` by default returns an object of type `Stream`, which will not have any methods available to perform updates, or any other streamtype-specific methods or accessors.  To be able to perform updates, as well as to access streamtype-specific data or functionality, you need to specialize the `loadStream` method on the StreamType of the Stream being loaded.
:::


## **Query a stream at a specific commit**

If you want to see the contents of a stream as of a specific point in time, it's possible to pass a _CommitID_ instead of a _StreamID_ to the `loadStream()` method described above. This will cause the Stream to be loaded at the specified commit, rather than the current commit as loaded from the network. When loading with a CommitID, the returned Stream object will be marked as readonly and cannot be used to perform updates. If you wish to perform updates, load a new instance of the Stream using its StreamID.

## **Query multiple streams**

Use the `multiQuery()` method to load multiple streams at once. The returned object is a map from _StreamIDs_ to stream instances.

```javascript
const queries = [
  {
    streamId: 'kjzl6cwe1jw...14',
  },
  {
    streamId: 'kjzl6cwe1jw...15',
  },
]
const streamMap = await ceramic.multiQuery(queries)
```


## **Query a stream using paths**

Use the `multiQuery()` method to load one or more streams using known paths from a root stream to its linked streams.

Imagine a stream `kjzl6cwe1jw...14` whose content contains the StreamIDs of two other streams. These StreamIDs exist at various levels within a nested JSON structure.

```javascript
{
  a: 'kjzl6cwe1jw...15',
  b: {
    c: 'kjzl6cwe1jw...16'
  }
}
```

In the stream above, the path from root stream `kjzl6cwe1jw...14` to linked stream `kjzl6cwe1jw...15` is `/a` and the path to linked stream `kjzl6cwe1jw...16` is `/b/c`. Using the StreamID of the root stream and the paths outlined here, we use `multiQuery()` to query all three streams at once without needing to explicitly know the StreamIDs of the two linked streams.

The `multiQuery()` below will return a map with all three streams.

```javascript
const queries = [{
  streamId: 'kjzl6cwe1jw...14'
  paths: ['/a', '/b/c']
}]
const streamMap = await ceramic.multiQuery(queries)
```


## **Helper methods**

To get specific information about the stream that you created or loaded you can use the accessors on the `Stream` class. Below are some examples.



### Get StreamID

Use the `stream.id` property to get the unique `StreamID` for this stream.

```javascript
const streamId = stream.id
```



### Get latest commit

Use the `stream.commitId` property to get latest CommitID of a stream.

```javascript
const commitId = stream.commitId
```



### Get all anchor commits

Use the `stream.anchorCommitIds` property to get all CommitIDs which are anchor commits for this stream.

```javascript
const anchorCommits = stream.anchorCommitIds
```
# CAIP-10 Link client

---

A CAIP-10 Link is a stream that stores a proof that links a blockchain address to a Ceramic account (DID), using the [CAIP-10 standard](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md) to represent blockchain addresses.


## Installation

---

```sh
npm install @ceramicnetwork/stream-caip10-link
```

### Additional requirements

- In order to load CAIP-10 Links, a [Ceramic client instance](../javascript-clients/ceramic-http.md) must be available
- To add/remove links, the client must also have an [authenticated DID](../authentication/did-jsonrpc.md)
- An authentication provider is needed to sign the payload for the given CAIP-10 account, using the `blockchain-utils-linking` module that should be installed as needed:

```sh
npm install @ceramicnetwork/blockchain-utils-linking
```

## Common usage

---

### Load a link

In this example we load a Caip10Link for the account `0x054...7cb8` on the Ethereum mainnet blockchain (`eip155:1`).

```ts
import { CeramicClient } from '@ceramicnetwork/http-client'
import { Caip10Link } from '@ceramicnetwork/stream-caip10-link'

const ceramic = new CeramicClient()

async function getLinkedDID() {
  // Using the Ceramic client instance, we can load the link for a given CAIP-10 account
  const link = await Caip10Link.fromAccount(
    ceramic,
    '0x0544dcf4fce959c6c4f3b7530190cb5e1bd67cb8@eip155:1',
  )
  // The `did` property of the loaded link will contain the DID string value if set
  return link.did
}
```

### Create a link

Here we can see the full flow of getting a user's Ethereum address, creating a link, and adding the users' DID account.

In this example we create a Caip10Link for the account `0x054...7cb8` on the Ethereum mainnet blockchain (`eip155:1`) and then associate it with the DID `did:3:k2t6...ydki`.

```ts
import { CeramicClient } from '@ceramicnetwork/http-client'
import { Caip10Link } from '@ceramicnetwork/stream-caip10-link'
import { EthereumAuthProvider } from '@ceramicnetwork/blockchain-utils-linking'

const ceramic = new CeramicClient()

async function linkCurrentAddress() {
  // First, we need to create an EthereumAuthProvider with the account currently selected
  // The following assumes there is an injected `window.ethereum` provider
  const addresses = await window.ethereum.request({
    method: 'eth_requestAccounts',
  })
  const authProvider = new EthereumAuthProvider(window.ethereum, addresses[0])

  // Retrieve the CAIP-10 account from the EthereumAuthProvider instance
  const accountId = await authProvider.accountId()

  // Load the account link based on the account ID
  const accountLink = await Caip10Link.fromAccount(
    ceramic,
    accountId.toString(),
  )

  // Finally, link the DID to the account using the EthereumAuthProvider instance
  await accountLink.setDid(
    'did:3:k2t6wyfsu4pg0t2n4j8ms3s33xsgqjhtto04mvq8w5a2v5xo48idyz38l7ydki',
    authProvider,
  )
}
```

### Remove a link

Removing a link involves a similar flow to setting the DID, but using the `clearDid` method instead of `setDid`:

```ts
import { CeramicClient } from '@ceramicnetwork/http-client'
import { Caip10Link } from '@ceramicnetwork/stream-caip10-link'
import { EthereumAuthProvider } from '@ceramicnetwork/blockchain-utils-linking'

const ceramic = new CeramicClient()

async function unlinkCurrentAddress() {
  // First, we need to create an EthereumAuthProvider with the account currently selected
  // The following assumes there is an injected `window.ethereum` provider
  const addresses = await window.ethereum.request({
    method: 'eth_requestAccounts',
  })
  const authProvider = new EthereumAuthProvider(window.ethereum, addresses[0])

  // Retrieve the CAIP-10 account from the EthereumAuthProvider instance
  const accountId = await authProvider.accountId()

  // Load the account link based on the account ID
  const accountLink = await Caip10Link.fromAccount(
    ceramic,
    accountId.toString(),
  )

  // Finally, unlink the DID from the account using the EthereumAuthProvider instance
  await accountLink.clearDid(authProvider)
}
```

<!--
## Additional Resources

- [CIP-10: CAIP10 Link Specification](https://github.com/ceramicnetwork/CIP/blob/main/CIPs/CIP-8/CIP-8.md)
- [Complete CAIP10Link.js API Reference]()

## Next Steps

---

- [Next step 1]()
-->
# Running Ceramic nodes in the cloud environment

---

This guide provides the instructions for launching a well-connected, production-ready Ceramic node in the cloud environment.

## Who should run a Ceramic node?

---

To run your application on `mainnet` you'll need to run your own production-ready node or to use a community hosted nodes provider like [hirenodes](https://hirenodes.io/).

## Things to know

---

**Ceramic networks** 
There are currently three main Ceramic networks: 
- `mainnet`
- `testnet-clay`
- `dev-unstable`

Learn more about each network [here](../../networking/networks.md). 

By default, Ceramic will connect to `testnet-clay` and a [Ceramic Anchor Service](https://github.com/ceramicnetwork/ceramic-anchor-service) running on Gnosis. When you are ready to get on Ceramic `mainnet`, check out [this guide](../../../../composedb/guides/composedb-server/access-mainnet) to get access to our `mainnet` anchor service running on Ethereum mainnet.

**Supported platforms** – You can run Ceramic nodes on a cloud provider of your choice. This guide will include instructions for the Digital Ocean Kubernetes, but the
instructions can be applied to the vast majority of other cloud providers like AWS and others.

**Supported Operating Systems:**

- Linux

:::note
At the moment, developers are provided with Linux-based docker images for cloud deployment.
:::

**Compute requirements:**

You’ll need sufficient compute resources to power `ceramic-one`, `js-ceramic` and `PostgreSQL`. Below are the recommended requirements:

- 4 vCPUs
- 8GB RAM

## Required steps

---

Below are the steps required for running a Ceramic node in production. This guide will teach you how to:


### Configure your Kubernetes Cluster

Running a Ceramic Node on DO Kubernetes will require two tools:

- [kubectl](https://kubernetes.io/docs/tasks/tools/) - the Kubernetes command line tool
- [doctl](https://docs.digitalocean.com/reference/doctl/how-to/install/) - the Digital Ocean command line tool

Make sure you have these tools installed on your machine before proceeding to the next step of this guide.

To create a Digital Ocean Kuberetes cluster, follow an official [DigitalOcean tutorial](https://docs.digitalocean.com/products/kubernetes/how-to/create-clusters/). The process of setting up your Kubernetes cluster will take about 10 minutes. Once it’s up and running, you are good to continue with the next step.

### Connect to your Kubernetes Cluster

Once the cluster is up and running, you will be provided a command that you can use to authenticate your cluster on your local machine. You will be provided with a command unique to your cluster, but For example:

```doctl kubernetes cluster kubeconfig save 362dda8b-b555-4c47-9bf0-1a81cf58e0a8```

Run this command on your local machine using your local terminal. After authenticating, verify the connectivity:

```kubectl config get-contexts```

### Deploy Ceramic

Running a Ceramic node will require configuring three components:
- `ceramic-one` - a binary which contains the Ceramic Recon protocol implementation in Rust
- `js-ceramic` - component which provides the API interface for Ceramic applications
- `postgres` - a database used for indexing

To simplify the configuration of all these services, you can use the [SimpleDeploy](https://github.com/ceramicstudio/simpledeploy/tree/main), a set of infra scripts that will make the configuration process faster and easier.

1. Clone the [simpledeploy](https://github.com/ceramicstudio/simpledeploy.git) repository and enter `ceramic-one` folder of the created directory:

```
git clone https://github.com/ceramicstudio/simpledeploy.git
cd simpledeploy/k8s/base/ceramic-one
```

2. Create a namespace for the nodes:

```
export CERAMIC_NAMESPACE=ceramic-one-0-17-0
kubectl create namespace ${CERAMIC_NAMESPACE}
```

3. Create ephemereal secrets for js-ceramic and postgres

```
./scripts/create-secrets.sh
```

4. Apply manifests:

```
kubectl apply -k .
```

5. Wait for the pods to start. It will take a few minutes for the deployment to pull the docker images and start the containers. You can watch the process with the following command:

```
kubectl get pods --watch --namespace ceramic-one-0-17-0
```

You will know that your deployment is up and running when all of the processes have a status `Running` as follows:

```bash
NAME           READY   STATUS    RESTARTS    AGE
ceramic-one-0  1/1     Running   0           77s
ceramic-one-1  1/1     Running   0           77s
js-ceramic-0   1/1     Running   0           77s
js-ceramic-1   1/1     Running   0           77s
postgres-0     1/1     Running   0           77s
```

Hit `^C` on your keyboard to exit this view.

:::note

You can easily access the logs of each of the containers by using the command below and configuring the container name. For example, to access the Ceramic node logs, you can run:

`kubectl logs --follow --namespace ceramic-one-0-17-0 js-ceramic-0`

:::

### Accessing your node

The Ceramic daemon serves an HTTP API that clients use to interact with your Ceramic node. The default API port is `7007`. SimpleDeploy scripts include a Load Balancer configuration for `js-ceramic` and `ceramic-one` pods which allows you to expose the service to the outside world and interact with your node using an external IP. For example, you can access the external IP of the `js-ceramic` pod using the following command:

`kubectl get svc --namespace ceramic-one-0-17-0 js-ceramic-lb-1`

After running this command you will see an output similar to the following:

```bash
NAME              TYPE           CLUSTER-IP       EXTERNAL-IP      PORT(S)          AGE
js-ceramic-lb-1   LoadBalancer   10.245.205.115   152.42.151.112   7007:30614/TCP   18m
```

The `EXTERNAL-IP` can be used to accessing your `js-ceramic` node. To test it out, copy the external IP address provided above and substitute it in the following health check command:

`curl 152.42.151.112:7007/api/v0/node/healthcheck`

You should see the output stating that the connection is alive:

`Alive!`


### Connect to the mainnnet anchor service
By default, your Ceramic node will connect to the Ceramic  `clay-testnet`. In order to connect your application to the mainnet, you will have to configure your node and verify you node DID for using the Ceramic Anchor Service (CAS). You can find a detailed step-by-step guide [here](../../../../composedb/guides/composedb-server/access-mainnet).



---

### Example with Docker containers

All state in this configuration is ephemeral, for persistence use docker-compose.

1. Start ceramic-one using the host network

```json
docker run --network=host \
  public.ecr.aws/r5b3e0r5/3box/ceramic-one:latest
```

2. Start js-ceramic using the host network

```json
docker run --network=host ceramicnetwork/js-ceramic:develop
```

### Docker-compose

1. Create a testing directory, and enter it.

```yaml
mkdir ceramic-recon
cd ceramic-recon
```

2. Create a file colled `docker-compose.yaml` with the configuration shown in the example below and save it:

```
version: '3.8'

services:
  ceramic-one:
    image: public.ecr.aws/r5b3e0r5/3box/ceramic-one:0.19.0
    network_mode: "host"
    volumes:
      - ceramic-one-data:/root/.ceramic-one

  js-ceramic:
    image: ceramicnetwork/js-ceramic:develop
    environment:
      - CERAMIC_RECON_MODE=true
    network_mode: "host"
    volumes:
      - js-ceramic-data:/root/.ceramic
      - ./daemon.config.json:/root/.ceramic/daemon.config.json
    command: --ipfs-api http://localhost:5101

volumes:
  ceramic-one-data:
    driver: local
  js-ceramic-data:
    driver: local
```

3. Update the js-ceramic configuration file `daemon.config.json` with the configurations provided below.

:::note
The js-ceramic configuration file can be found using the following path: `$HOME/.ceramic/daemon.config.json `
:::


```json
{
  "anchor": {
    "auth-method": "did"
  },
  "http-api": {
    "cors-allowed-origins": [
      ".*"
    ],
    "admin-dids": [
    ]
  },
  "ipfs": {
    "mode": "remote",
    "host": "http://localhost:5101"
  },
  "logger": {
    "log-level": 2,
    "log-to-files": false
  },
  "metrics": {
    "metrics-exporter-enabled": false,
    "prometheus-exporter-enabled": true,
    "prometheus-exporter-port": 9465
  },
  "network": {
    "name": "testnet-clay"
  },
  "node": {   },
  "state-store": {
    "mode": "fs",
    "local-directory": "/root/.ceramic/statestore/"
  },
  "indexing": {
    "db": "sqlite://root/.ceramic/db.sqlite3",
    "allow-queries-before-historical-sync": true,
    "disable-composedb": false,
    "enable-historical-sync": false
  }
}
```

3. Run `docker-compose up -d`


---








# Launch a local Ceramic node

---

To run a local Ceramic node you will generally need to run two key components:
- `js-ceramic` - an api interface for Ceramic applications
- `ceramic-one` - a binary that provides a Ceramic data network access through the protocol implementation in Rust.

You should always start with running the `ceramic-one` component first to make sure that the `js-ceramic` component can connect to it.

## Prerequisites

---

Installing the `js-ceramic` requires the following:
- a terminal of your choice, 
- [Node.js](https://nodejs.org/en/) v20, 
- [npm](https://www.npmjs.com/get-npm) v10

Make sure to have these installed on your machine.


## Setting up the `ceramic-one` component

The easiest way to install the `ceramic-one` is using [Homebrew](https://brew.sh/) package manager. After installing Homebrew on your local machine, you can install `ceramic-one` using the following command:

```bash
brew install ceramicnetwork/tap/ceramic-one
```

Once installed, run the ceramic-one binary by running the command provided below. Not that using the flag `--network` you can modify the network:

```bash
ceramic-one daemon --network testnet-clay 
```

:::note
There are many flags for the daemon CLI that can be passed directly or set as environment variables. You can pass the `-h` flag to see the complete list as follows:

```ceramic-one daemon -h```
:::

You also have an option of running the `ceramic-one` binary using Docker. Check out the instructions in the [README of rust-ceramic repository](https://github.com/ceramicnetwork/rust-ceramic?tab=readme-ov-file).


## Setting up the `js-ceramic` component

The Ceramic command line interface provides an easy way to start a JS Ceramic node in a local Node.js environment. This is a great way to get started developing with Ceramic before moving to a cloud-hosted node for production use cases.


### Install the Ceramic CLI

Open your console and install the CLI using npm:

```bash
npm install -g @ceramicnetwork/cli
```

### Launch the `js-ceramic` node

Use the `ceramic daemon` command to start a local JS Ceramic node connected to the [Clay Testnet](../../networking/networks.md#clay-testnet) by default running at `https://localhost:7007`:

```bash
ceramic daemon
```

### Configure your network

(Optional) By default, the JS CLI starts a node on the [Clay Testnet](../../networking/networks.md#clay-testnet). If you would like to use a different network, you can specify this using the `--network` option. View [available networks](../../networking/networks.md). Note, the CLI can not be used with [Mainnet](../../networking/networks.md#mainnet).

### Configure a node URL

(Optional) It is possible to use the CLI with a remote Ceramic node over HTTP, instead of a local node. To do this, use the `config set` command to set the `ceramicHost` variable to the URL of the node you wish to use.

```bash
ceramic config set ceramicHost 'https://yourceramicnode.com'
```

## Monitoring
You can always check if `js-ceramic` and `ceramic-one` components are available by running the commands listed below.

### `js-ceramic` service's availability

Check the `js-ceramic` service’s availability with the healthcheck endpoint:

```json
curl http://localhost:7007/api/v0/node/healthcheck
```

### `ceramic-one` service's availability

Check the ceramic-one service’s availability with the liveness endpoint:

```json
curl http://127.0.0.1:5101/ceramic/liveness
```# Ceramic Development Guides
---

Guides that support development on Ceramic.

### Ceramic Nodes

-  [**Running Locally**](./ceramic-nodes/running-locally.md)
-  [**Running in the Cloud**](./ceramic-nodes/running-cloud.md)

### Ceramic Clients

-  [**JavaScript Client**](./ceramic-clients/javascript-clients/ceramic-http.md)
-  [**Authentication**](./ceramic-clients/authentication/key-did.md)
-  [**Stream APIs**](./ceramic-clients/stream-api/caip10-link.md)
# Data Feed API

The Ceramic Data Feed API gives developers a way to keep track of all the new state changes that are happening in the Ceramic network. There are 2 scenarios that would trigger an update on the feed:

1. Writes explicitly sent to the Ceramic node via the HTTP Client
2. Writes discovered from the network for Streams belonging to Models that are indexed on the Ceramic node

This information can be used to take actions or simply stay updated on the current status of a stream or even a network. Data Feed API enables developers to build custom indexers or databases.


# Server-Sent Events and EventSource interface
To understand Data Feed API, it's important to have a basic understanding of [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) and the [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) interface.

SSE is a simple and efficient way for servers to send real-time updates to web clients over a single HTTP connection. It works with the standard HTTP protocol, which makes it great for situations where the server needs to constantly update the client.

The EventSource interface is a JavaScript API that makes it easy for web applications to consume SSE. It allows clients to receive updates as a stream of events, making it simple to integrate real-time data into web apps.

---

# Getting started
The guide below will cover the main steps you need to follow to start interacting with Data Feed API.

## Configure your working environment  

### 1. Run a Ceramic node
To interact with Data Feed API you will need a Ceramic testnet or mainnet node up and running. Check out the [Quickstart](../../../composedb/set-up-your-environment.mdx) for instructions on how to run Ceramic nodes locally and [Running in the Cloud](../../../composedb/guides/composedb-server/running-in-the-cloud.mdx) guide for instructions on how to run a Ceramic node in the cloud.

:::tip
Make sure that your Ceramic node is using the Ceramic version 5.3 or higher to make sure that it supports the Data Feed logic.
:::

### 2. Install additional dependencies
Depending on how you use the Data Feed API, you may need additional dependencies installed on your machine:
- Cross-eventsource to use EventSource isomorphically on Node.js and browser:

```bash
npm i cross-eventsource
```

- `@ceramicnetwork/codecs` and `codeco` for encoding and decoding:
```bash
npm i @ceramicnetwork/codecs codeco 
```

## Interact with the Data Feed API

Below you can see a few examples of how you can interact with the Data Feed API. Currently, Data Feed API is available as read-only with support for `GET` methods and access to Ceramic's aggregation layer.

The following request `GET` will return the following type of objects as activity is done on the Ceramic node:

**Request:**
`GET /api/v0/feed/aggregation/documents`

**Response:**
```javascript
FeedDocument = {
  commitId: CommitID
  content: any
  metadata: StreamMetadata
  eventType: EventType
}
```

For example, the following request will return a response with the details provided below.
**Request:**
 `curl http://localhost:7007/api/v0/feed/aggregation/documents`

**Response:**
```javascript
data: {
  "commitId": "k6zn3t2py84tn1dpy24625xjv65g4r23wuqpch6mmrywshreivaqiyaqctrz2ba5kk0qjvec61pbmyl15b49zxfd8qd3aiiupltnpveh45oiranqr4njj40",
  "content": "{...}",
  "metadata": {
    "controllers": [
      "did:key:z6MknE3RuK7XU2W1KGCQrsSVhzRwCUJ9uMb6ugwbELm9JdP6"
    ],
    "model": "kh4q0ozorrgaq2mezktnrmdwleo1d"
  },
  "eventType": 2
}

```



The recommended way of interacting with the Data Feed API is by using event listeners as show in the example below. The provided example is using `localhost:7007` as the host:

```typescript
import { EventSource  } from "cross-eventsource";
import { JsonAsString, AggregationDocument } from '@ceramicnetwork/codecs';
import { decode } from "codeco";

const source = new EventSource('http://localhost:7007/api/v0/feed/aggregation/documents')
const Codec = JsonAsString.pipe(AggregationDocument)

source.addEventListener('message', (event) => {
	console.log('message', event)
	//use JsonAsString, and AggregationDocument to decode and use event.data
	const parsedData = decode(Codec, event.data);
	console.log('parsed', parsedData)
})

source.addEventListener('error', error => {
	console.log('error', error)
})

console.log('listening...')
```

## Resumability

In case your application drops a connection and needs to start where it dropped, Data Feed API could be resumed. Every event emitted by the Data Feed API contains `resumeToken` property. When initiating a connection, you might ask to emit entries after `resumeToken`. 

For example, your application got an entry containing `resumeToken: "1714742204565000000"`. When connecting, pass the token value as a query parameter to emit the entries after this checkpoint:

```javascript
// ... same as a code snipped above
const url = new URL("http://localhost:7007/api/v0/feed/aggregation/documents")
url.searchParams.set('after', '1714742204565000000') // Value of the last resumeToken
// Connection to http://localhost:7007/api/v0/feed/aggregation/documents?after=1714742204565000000
const source = new EventSource(url)
```


## Frequently asked questions

<details>
  <summary>How to get the StreamId from the feed?</summary>
  <div>
    <div>
      The StreamId can be extracted from the CommitID included in the feed response as seen below:
      ```tsx
        ...

        source.addEventListener('message', (event) => {
	        console.log('message', event)
	        //use JsonAsString, and AggregationDocument to decode and use event.data
	        const parsedData = decode(Codec, event.data)
	        const streamId = parsedData.commitId.baseID
	        console.log('parsed', parsedData)
	        console.log('StreamID',streamId)
        })
        ...
        ```
    </div>
  </div>
</details>

<details>
  <summary>What are delivery guarantees of the Feed API?</summary>
  <div>
    <div>
      The feed sends data according to “at least once” guarantee. For every stream change, the latest stream state is delivered. For example, if a stream went through changes `a`, `b`, `c` giving states `A`, `B`, `C`, you could expect three events over Feed API: `C`, `C`, `C`.
    </div>
  </div>
</details>

<details>
  <summary>How far in the past could I resume from?</summary>
  <div>
    <div>
      You could expect up to 7 days worth of history stored.
    </div>
  </div>
</details>


# Event Fetching

Once a tip is discovered through the [Tip Gossip](tip-queries.md) or [Tip Query](tip-queries.md) protocols a node knows both the StreamID and the latest event CID of the stream. The latest Event contains the CID of the `prev` Event and so on until the Init Event is found in the event log. The Init Event's CID is also in the StreamID. This is proof that the tip is part of the stream identified by the StreamId.

The tip is one of [Init, Data, or Time Event](../streams/event-log.md). If the tip CID is the initial event CID then the stream has never been updated and the initial event is the complete event log. If the tip CID points to a Data, or Time event then that event will contain a `prev` field with a CID link to its previous event. IPFS can be used to retrieve this event. Similarly you can use IPFS to recursively fetch and resolve every `prev` event in an event log until reaching the initial event. At that point you have retrieved and synced the entire stream. 

Fetching an event with IPFS from a peer both relies on [IPFS BitSwap](https://docs.ipfs.tech/concepts/bitswap/) and the [IPFS DHT](https://docs.ipfs.tech/concepts/dht/).# Networking

Networking sub-protocols for Ceramic.

### Overview

Ceramic streams and nodes are grouped into independent networks. These networks can be either for public use or for use by a specific community. There are currently a few commonly shared and default networks. When a stream is published in a network, other nodes in the same network are able to query and discover the stream, receive the latest stream events (tips), and sync the entire event set for a stream. Each of the these network functions are defined by a sub protocol listed below.

### [Networks](networks.md)

Networks are collections of Ceramic [nodes](../nodes/overview.md) that share specific configurations and communicate over dedicated [libp2p](https://libp2p.io/) pubsub topics. They are easily identified by a path string, for example `/ceramic/mainnet` .

### [Data Feed API](data-feed-api.md)

The Ceramic Data Feed API gives developers a way to keep track of all the new state changes that are happening in the Ceramic network. This enables developers to customize the way their data is indexed and queried, and enables the development of new custom database products on top of Ceramic.
# Networks

Information about the default Ceramic networks

## Overview
---

Networks are collections of Ceramic [nodes](../nodes/overview.md) that share specific configurations and communicate over dedicated [libp2p](https://libp2p.io/) pubsub topics. Networks are disjoint from one another; streams that exist on one network are **not** discoverable or usable on another.

These pubsub topics are used to relay all messages for the defined networking sub protocols. 

## All Networks
---

An overview of the various Ceramic networks available today:

| Name | Network ID | Ceramic Pubsub Topic | Timestamp Authority | Type |
| --- | --- | --- | --- | --- |
| Mainnet | mainnet | /ceramic/mainnet | Ethereum Mainnet (EIP155:1) | Public |
| Clay Testnet | testnet-clay | /ceramic/testnet-clay | Ethereum Gnosis Chain | Public |
| Dev Unstable | dev-unstable | /ceramic/dev-unstable | Ethereum Goerli Testnet | Public |
| Local | local | /ceramic/local-$(randomNumber) | Ethereum by Truffle Ganache | Private |
| In-memory | inmemory |  | None | Private |

:::note
    There is currently a proposal to decompose each network into multiple pubsub topics for scalability, the pubsub topics will remain prefixed by the network identifier `/ceramic/<network>/<sep>` see [CIP-120](https://github.com/ceramicnetwork/CIP/blob/main/CIPs/cip-120.md)
:::

## Public networks
---

Ceramic has three public networks that can be used when building applications:

- Mainnet
- Testnet Clay
- Dev Unstable

### Mainnet

Mainnet is the main public network used for production deployments on Ceramic. Ceramic's mainnet nodes communicate over the dedicated `/ceramic/mainnet` libp2p pubsub topic and use Ethereum's mainnet blockchain (`EIP155:1`) for generating timestamps used in [time events](../streams/event-log.md) for streams. 

### Clay Testnet

Clay Testnet is a public Ceramic network used by the community for application prototyping, development, and testing purposes. Ceramic core devs also use Clay for testing official protocol release candidates. While we aim to maintain a high level of quality on the Clay testnet that mirrors the expectations of Mainnet as closely as possible, ultimately the reliability, performance, and stability guarantees of the Clay network are lower than that of Mainnet. Because of this, **the Clay network should not be used for applications in production**. 

Clay nodes communicate over the dedicated `/ceramic/testnet-clay` libp2p pubsub topic and use Ethereum's Gnosis blockchain for generating timestamps used in [time events](../streams/event-log.md) for streams.

### Dev Unstable

Dev Unstable is a public Ceramic network used by Ceramic core protocol developers for testing new protocol features and the most recent commits on the develop branch of `js-ceramic`. It should be considered **unstable and highly experimental**; only use this network if you want to test the most cutting edge features, but expect issues.

Dev Unstable nodes communicate over the dedicated `/ceramic/dev-unstable` libp2p pubsub topic and use Ethereum's Goerli testnet blockchains for generating timestamps used in [time events](../streams/event-log.md) for streams. 

## Private Networks
---

You can prototype applications on Ceramic by running the protocol in a local environment completely disconnected from other public nodes. Here "private" indicates that it is independent of the mainnet network, but does **not** imply any confidentiality guarantees. This is still public data.

### Local

Local is a private test network used for the local development of Ceramic applications. Nodes connected to the same local network communicate over a randomly-generated libp2p topic `/ceramic/local-$(randomNumber)` and use a local Ethereum blockchain provided by Truffle's [Ganache](https://trufflesuite.com/ganache/) for generating timestamps used in [time events](../streams/event-log.md) for streams. 

## Examples
---

### TypeScript Definitions

```tsx
enum Networks {
  MAINNET = 'mainnet', // The prod public network
  TESTNET_CLAY = 'testnet-clay', // Should act like mainnet to test apps
  DEV_UNSTABLE = 'dev-unstable', // May diverge from mainnet to test Ceramic
  LOCAL = 'local', // local development and testing
  INMEMORY = 'inmemory', // local development and testing
}
```# Tip Gossip

When a stream is updated, the latest event (tip) is gossiped and propagated out to all the nodes in a network that are interested in that particular stream. Additionally, listening for all tips, allows a node to learn about streams it did not know about. This allows all interested nodes in the network to quickly get the latest update and state for a stream.

## Protocol
---

### Publishing Updates

When an event is created and appended to a stream, the node will publish an update message to the network. All messages are broadcast on the [libp2p pubsub](https://github.com/libp2p/specs/tree/master/pubsub) topic for the [network](networks.md) this node is configured for. Any other node listening on this network will receive the update and then can decide to take any further action or discard. 

### Update Messages

```tsx
type UpdateMessage = {
  typ: MsgType.UPDATE //0
  stream: StreamID
  tip: CID
  model?: StreamID
}
```

Where:

- **`typ`** - the message is an update message, enum `0`
- **`stream`** - streamId of the stream which this update is for
- **`tip`** - CID of the latest event (tip) of the stream, the update
- **`model`** - streamId of the ComposeDB data model that the stream being updated belongs to (optional)

### Replicating Updates

Any nodes that have received an update message and are interested in that stream can now save the tip (update). Any node that has saved this update can now answer [tip queries](tip-queries.md) for this stream. As long as there is at least one node in the network with this information (tip) saved, the publishing node can go down without effecting the availability of the stream.

## Examples
---

### TypeScript  Definitions

```tsx
/**
 * Ceramic Pub/Sub message type.
 */
enum MsgType {
  UPDATE = 0,
  QUERY = 1,
  RESPONSE = 2,
  KEEPALIVE = 3,
}

type UpdateMessage = {
  typ: MsgType.UPDATE
  stream: StreamID
  tip: CID  // the CID of the latest commit
  model?: StreamID // optional
}

// All nodes will always ignore this message
type KeepaliveMessage = {
  typ: MsgType.KEEPALIVE
  ts: number // current time in milliseconds since epoch
  ver: string // current ceramic version
}
```# Tip Queries

Ceramic streams are identified by a [URI](../streams/uri-scheme) called StreamIds. Nodes that want to sync a stream need to query the network for the tip of that stream using its StreamId. 

!!!note
    Tips are the most recent Init, Data, or Time event for a given Stream Tip


## Protocol
---

A node resolving a Ceramic URI sends a query message to the network and then listens for responses with the candidates for the current tip of the stream. Any node that is interested in the same stream on the network and has stored its tips will respond with a response message. All messages are sent on the [libp2p pubsub](https://github.com/libp2p/specs/tree/master/pubsub) topic for the [network](networks.md) the node is configured for.

### **Query Message**

```tsx
type QueryMessage = {
  typ: MsgType.QUERY // 1
  id: string
  stream: StreamID
}
```

Where:

- **`typ`** - the message is a query message, enum `1`
- **`stream`** - the streamId that is being queried or resolved
- **`id`** - a multihash `base64url.encode(sha265(dagCBOR({typ:1, stream: streamId})))`, can generally be treated as a random string that is used to pair queries to responses

### **Response Message**

```tsx
type ResponseMessage = {
  typ: MsgType.RESPONSE // 2
  id: string
  tips: Map<StreamId, CID> 
}
```

Where:

- **`typ`** - the message is a response message, enum `2`
- **`id`** - id of the query that this message is a response to
- **`tips`** - map of `StreamID` to CID of stream tip

:::note
    Currently this will only ever have a single `StreamID` in the query, but Ceramic will likely have batch queries at some point in the future.
:::

## Examples
---

### TypeScript Definitions

```tsx
enum MsgType { // Ceramic Pub/Sub message type.
  UPDATE = 0,
  QUERY = 1,
  RESPONSE = 2,
  KEEPALIVE = 3,
}

type QueryMessage = {
  typ: MsgType.QUERY
  id: string
  stream: StreamID
}

type ResponseMessage = {
  typ: MsgType.RESPONSE
  id: string
  tips: Map<string, CID>
}
```# Nodes Overview
---

## Ceramic Nodes

A Ceramic node is a bundle of services and long-lived processes that support the protocol and provide access to the Ceramic Network. Current implementations bundle and run most all of the following services and sub protocols defined here. This includes the following:


### **Ceramic Services**

| Service | Description |
| --- | --- |
| StateStore | Tracks and stores the latest tips for pinned streams and caches stream state.  |
| Networking | Runs the stream query and update protocols on Gossipsub and manages peer connections.  |
| API | Provides HTTP API service for connected Ceramic clients to read, write and query streams. Additionally, some node management functions are included.  |
| Timestamping | Regularly publishes timestamp proofs and Ceramic time events for a given set of events.  |

:::note

    In the future, node implementations may only provide a subset of services to the network. For example, nodes may be optimized to provide only indexing, long term storage, client APIs etc.
:::

## Timestamp Nodes

---

Timestamping nodes support a small but important subset of the Ceramic protocol. Timestamping is entirely described by [CAIP-168 IPLD Timestamp Proof](https://chainagnostic.org/CAIPs/caip-168) and Ceramic Time Events.  Timestamp services aggregate events from streams to be timestamped, construct Merkle proofs, publish transactions and publish timestamp events to the Ceramic Network. Ceramic mainnet currently supports `f(bytes32)`  timestamp transaction types on Ethereum mainnet. This transaction type is entirely described by the [`eip155` namespace](https://github.com/ChainAgnostic/namespaces/blob/main/eip155/caip168.md) for CAIP-168. 

## Implementations

---

The following table includes active node implementations:

| Node | Name | Language | Description | Status | Maintainer |
| --- | --- | --- | --- | --- | --- |
| Ceramic | [js-ceramic](https://github.com/ceramicnetwork/js-ceramic/) | JavaScript | Complete Ceramic implementation. Runs all Ceramic core services, and connects to an IPFS node for all IPFS, libp2p, IPLD services needed. | Production | 3Box Labs |
| Timestamp | [ceramic-anchor-service](https://github.com/ceramicnetwork/ceramic-anchor-service) | JavaScript | Complete timestamp services. Supports f(bytes32) and raw transaction types for EVM (EIP-155) blockchains.  | Production | 3Box Labs |

Longterm Ceramic is targeting multiple implementations of the protocol to support general resilience, robustness and security. Want to work on a node implementation in a new language like Rust or Go? Get in touch on the Forum!# Running a Node
---
This will help explain how to run a Ceramic Node and some other specifics that are recommended to make sure your node is running smoothly. 

## Installation
---

### Install and Run the Ceramic CLI

This can be installed from NPM and updated through NPM by using the following command:

```bash
npx @ceramicnetwork/cli daemon
```

:::note
Make sure that you have `ceramic-one` binary running in the background. To set it up, follow the setup steps [here](../guides/ceramic-nodes/running-locally#setting-up-the-ceramic-one-component).
:::


This will install the CLI and start the daemon. This will allow all of the initial files to be created. This will successfully have a node running on the Clay TestNet.

## Operations Considerations
---

### Log Rotate

As a node runs for sometime if you enable the log to files you will want to enable `logrotate` to ensure that your node does not overfill the hard drive. This can be done by following the following steps:

1. Install `logrotate` using the following command:

```bash
sudo apt install logrotate
```

2. Create a file in `/etc/logrotate.d/ceramic` with the following contents:

```bash
/home/ubuntu/.ceramic/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        systemctl restart ceramic
    endscript
}
```

3. Enable and Start the `logrotate` service using the following commands:

```bash
sudo systemctl enable logrotate
sudo systemctl start logrotate
```

### Monitoring

It is strongly recommended to use your existing monitoring system to collect and process the [metrics offered by the node](../../../composedb/guides/composedb-server/server-configurations.mdx).


#### Availability

Check the `js-ceramic` service’s availability with the healthcheck endpoint

```json
curl http://localhost:7007/api/v0/node/healthcheck
```

Check the `ceramic-one` service’s availability with the liveness endpoint

```json
curl http://127.0.0.1:5101/ceramic/liveness
```

#### Metrics

Both `ceramic-one` and `js-ceramic` have prometheus compatible endpoints available.

`ceramic-one` is enabled by default 

```jsx
curl http://127.0.0.1:9464/metrics # ceramic-one metrics
```

js-ceramic monitoring configuration is described [here](https://developers.ceramic.network/docs/composedb/guides/composedb-server/server-configurations#prometheus-endpoint0).# Ceramic Protocol

Ceramic is a decentralized event streaming protocol that enables developers to build decentralized databases, distributed compute pipelines, and authenticated data feeds, etc. Ceramic nodes can subscribe to subsets of streams forgoing the need of a global network state. This makes Ceramic an eventually consistent system (as opposed to strongly consistent like L1 blockchains), enabling web scale applications to be built reliably.


The latest release of Ceramic has introduced a new Rust-based implementation of Ceramic protocol which offers performance and stability improvements as well as a new data synchronisation protocol called Recon. Developers, building on Ceramic network will be using two main components:
- `js-ceramic` component which provides the API interface for Ceramic applications
- `ceramic-one` component which provides Ceramic data network access (contains the implementation of Recon protocol).

 <div style={{textAlign: 'center'}}>
![protocol-overview](/img/protocol.png)
</div>


The protocol doesn't prescribe how to interpret events found within streams; this is left to the applications consuming the streams. Some examples of this type of application are:
- [OrbisDB](https://useorbis.com/)
- [ComposeDB](../../composedb/getting-started)

# Consensus

## Consensus Model

---

Event streams rely on a limited conflict resolution or consensus model. Global consensus and ordering is not needed for progress and most decisions are localized to the consuming party of a single event stream. Guarantees are limited, but if any two parties consume the same set of events for a stream, they will arrive at the same state. 

The underlying log structure of an event stream allows multiple parallel histories, or branches, to be created resulting in a tree structure. A log or valid event stream is a single tree path from a known "latest" event to the Init Event. Latest events are also referred to as stream "tips". Logs can have multiple tips when there are branches in the log, and the "tip" selection for the canonical log of a stream becomes a consensus problem. 

### Single stream consensus

A tip and canonical log for a stream are selected by the following pseudo algorithm and rules: 

1. Given a set of tips, traverse each tree path from tip till a commonly shared Time Event or the Init Event. 
2. From the shared event, traverse each path in the opposite direction (towards tip) until a Time Event is found (or the end of the log is reached). This set of events are considered conflicting events.
3. Given each Time Event, determine the blockheight for the transaction included in the timestamp proof. Select the path with lowest blockheight. If a single path is selected, exit with path and tip selected, otherwise continue. Most cases will terminate here, it will be rare to have the same blockheight.
4. If multiple tips have the same blockheight, select the path with the greatest number of events from the last timestamp proof till tip. If single path selected, exit with path and tip selected, otherwise continue.
5. If number of events is equal, chooses the event and path which has the smallest CID in binary format (an arbitrary but deterministic choice)

### Cross stream ordering

It is assumed all timestamp events in a network are committed to the same blockchain, as specified by the `chainId` in the timestamp event. The main Ceramic network commits timestamp proofs to the Ethereum blockchain. 

The addition of timestamp events in streams gives some notion of relative global time for all events time-stamped on the same blockchain. This allows events across different streams to be globally ordered if a higher-level protocol requires it. Ceramic events can also be ordered against transactions and state on the blockchain in which it is timestamped. On most secure blockchains you can also reference wall clock time within some reasonable bounds and order events both in and out of the system based on that. 

## Risks

---

### Late Publishing

Without any global consensus guarantees, all streams and their potential tips are not known by all participants at any point in time. There may be partitions in the networks, existence of local networks, or individual participants may choose to intentionally withhold some events while publishing others. Selective publishing like this may or may not be malicious depending on the context in which the stream is consumed.

Consider the following example: A user creates a stream, makes two conflicting updates and timestamps one of them earlier than the other, but only publishes the data of the update that was timestamped later. Now subsequent updates to the stream will be made on top of the second, published update. Every observer will accept these updates as valid since they have not seen the first update. However if the user later publishes the data of the earlier update, the stream will fork back to this update and all of the other updates made to the stream will be invalidated.

Most of the time, the potential of an intentional late publishing attack isn't a concern in practice, as streams in Ceramic are generally controlled by a single user, and there's no incentive to attack one's own streams. This would become more of a concern, however, in streams with more sophisticated access control that allowed multiple end users to write into the same stream.  In that case, all users of the stream would need to trust all the other users who have - or have ever had - write access to the stream to not be secretly sitting on timestamped writes that they haven't yet published, or else risk those writes being revealed later on and causing the stream to lose all writes that have occurred since the previously secret write was created.

Additionally, note that late publishing may also be used as a deterrent to selling user identities. An identity or account buyer can't know that the seller is not keeping secret events that they will publish after the identity was sold.# Event Log

---

The core data structure in the Ceramic protocol is a self-certifying event log. It combines IPLD for hash linked data and cryptographic proofs to create an authenticated and immutable log. This event log can be used to model mutable databases and other data structures on top.

## Introduction

---

Append-only logs are frequently used as an underlying immutable data structure in distributed systems to improve data integrity, consistency, performance, history, etc. Open distributed systems use hash linked lists/logs to allow others to verify the integrity of any data. IPLD provides a natural way to define an immutable append-only log. 

- **Web3 authentication** - When combined with cryptographic signatures and blockchain timestamping, it allows authenticated writes to these logs using blockchain accounts and DIDs
- **Low cost decentralization** - Providing a common database layer for users and applications besides more expensive on-chain data or centralized and siloed databases
- **Interoperability, flexibility, composability** - A minimally defined log structure allows a base level of interoperability while allowing diverse implementations of mutable databases and data structures on top. Base levels of interoperability include log transport, update syncing, consensus, etc.

## Events

---

Logs are made up of events. An init event originates a new log and is used to reference or name a log. The name of a stream is referred to as a [StreamId](uri-scheme.md#streamid). Every additional "update" is appended as a data event. Periodically, time events are added after one or more data events. Time events allow you to prove an event was published at or before some point in time using blockchain timestamping. They can also be used for ordering events within streams and for global ordering across streams and blockchain events. The minimal definition of a log is provided here, additional parameters in both the headers and body are defined at application level or by higher level protocols. 

Data events (and often Init Events) are signed DAGJWS and encoded in IPLD using the [DAG-JOSE codec](https://ipld.io/specs/codecs/dag-jose/spec/). Event payloads are typically encoded as DAG-CBOR, but could be encoded with any codec supported by a node or the network. Formats and types are described using [IPLD schema language](https://ipld.io/docs/schemas/) and event encoding is further described below. 

### Init Event

A log is initialized with an init event. The CID of this event is used to reference or name this log in a [StreamId](uri-scheme.md#streamid). An init event may be signed or unsigned.

```bash

type InitHeader struct {
  controllers [String]
}
type InitPayload struct {
  header InitHeader
  data optional Any 
}

type InitJWS struct { // This is a DagJWS
  payload String
  signatures [Signature]
  link: &InitPayload
}

type InitEvent InitPayload | InitJWS

```

#### Parameters defined as follows:

- **`controllers`** - an array of DID strings that defines which DIDs can write events to the log, when using CACAO, the DID is expected to be the issuer of the CACAO. Note that currently only a single DID is supported.
- **`data`** - data is anything, if defined the Init Event must match the InitJWS struct or envelope and be encoded in DAG-JOSE, otherwise the InitPayload would be a valid init event alone and encoded in DAG-CBOR

### Data Event

Log updates are data events. Data events are appended in the log to an init event, prior data events or a time event. A data event MUST be signed. 

```bash
type Event InitEvent | DataEvent | TimeEvent

type DataHeader struct {
  controllers optional [String]
}

type DataEventPayload struct {
  id &InitEvent
  prev &Event
  header optional DataHeader
  data Any 
}

type DataEvent struct { // This is a DagJWS
  payload String
  signatures [Signature]
  link: &DataEventPayload
}
```

Additional parameters defined as follows, controllers and data defined same as above.

- **`id`** - CID (Link) to the init event of the log
- **`prev`** - CID (Link) to prior event in log
- **`header`** - Optional header, included here only if changing header parameter value (controllers) from prior event. Other header values may be included outside this specification.

This being a minimally defined log on IPLD, later specifications or protocols can add additional parameters to both init and data events and their headers as needed. 

### Time Event

Time events can be appended to init events, and 1 or more data events. Reference [CAIP-168 IPLD Timestamp Proof](https://chainagnostic.org/CAIPs/caip-168) specification for more details on creating and verifying time events. Time Events are a simple extension of the IPLD Timestamp Proof specification, where `prev` points to the prior event in the log and is expected to be the data for which the timestamp proof is for. A timestamp event is unsigned.

```bash
type TimeEvent struct {
  id &InitEvent
  prev &DataEvent | &InitEvent
  proof Link
  path String
}
```

## Verification

---

A valid log is one that includes data events as defined above and traversing the log resolves to an originating init event as defined above. Each event is valid when it includes the required parameters above and the DAGJWS signature is valid for the given event `controller` DID and valid as defined below. Time events are defined as valid by CAIP-168. There will likely be additional verification steps specific to any protocol or application level definition.

## Encoding

---

### JWS & DAG-JOSE

All signed events are encoded in IPLD using [DAG-JOSE](https://ipld.io/specs/codecs/dag-jose/spec/). DAG-JOSE is a codec and standard for encoding JOSE objects in IPLD. JOSE includes both[JWS](https://datatracker.ietf.org/doc/rfc7515/?include_text=1) for signed JSON objects and [JWE](https://datatracker.ietf.org/doc/rfc7516/?include_text=1) for encrypted JSON objects. JWS is used for events here and is commonly used standard for signed data payloads. Some parameters are further defined for streams. The original DAG-JOSE specification can be found [here](https://ipld.io/specs/codecs/dag-jose/spec/).

The following defines a general signed event, both init and data events are more specifically defined above. 

```bash
type Signature struct {
  header optional { String : Any }
  // The base64url encoded protected header, contains:
  // `kid` - the DID URL used to sign the JWS
  // `cap` - IPFS url of the CACAO used (optional)
  protected optional String
  signature String
}

type EventJWS struct {
  payload String
  signatures [Signature]
  link: &Event
}
```

Where:

- **`link`** - CID (Link) to the event for which this signature is over. Provided for easy application access and IPLD traversal, expected to match CID encoded in payload
- **`payload`** - base64url encoded CID link to the event (JWS payload) for which this signature is over
- **`protected`** - base64 encoded JWS protected header
- **`header`** - base64 encoded JWS header
- **`signature`** - base64 encoded JWS signature# Stream Lifecycle

## Write Lifecycle

---

### Create

A stream is created when an [Init Event](event-log.md) is created and published. The stream is then uniquely referenced in the network by its [StreamId](uri-scheme.md), which is derived from this Init Event. 

### Update

Updates to a stream include the creating and publishing of data events or timestamp events. When creating these events they must reference the latest event or tip in the stream. The latest event, if there is multiple, is determined by locally following the conflict resolution and [consensus rules](consensus.md). The current update protocol is described further [here](../networking/tip-gossip.md). 

The data event is a signed event and is expected to be created and published by the controller of the given stream it is being appended. A timestamp event on the other hand can be created by any participant in network, given that it is a valid timestamp proof. Typically in the Ceramic network they will be created and published by a timestamping service. 

## Read Lifecycle

---

### Query

The network can be queried to discover the latest tips for any stream by StreamId. Knowing both the StreamId and tip then allows any node to sync the stream. Query requests are broadcast to the entire network to discover peers that have tips for any given stream. Future query protocols can be optimized and include other stream attributes and values to discover streams and stream tips. The current query protocol is described further [here](../networking/tip-queries.md). 

### Sync

Streams can be synced and loaded by knowing both the StreamId and the latest event (tip). Given the latest tip you can traverse the stream event log from event to event in order until the Init Event is reached. Each event is loaded from peers in the network, any peer with a tip is expected to have the entirety of the event stream log. The current sync protocol is described further [here](../networking/event-fetching.md).

## Durability

---

### Maintenance
A stream is a set of [events](event-log.md) and these events are stored in IPFS nodes. As long as the entire set of events is pinned and advertised on the IPFS DHT, the respective stream will be retrievable. If your application depends on a stream remaining available, it is your application's responsibility to maintain and store all of its events. This can be done by running your own IPFS nodes or by using an IPFS pinning service. Typically you will be running an IPFS node with Ceramic. 

If any events are not available at a given time, it is not a guarantee that the stream has been deleted. A node with a copy of those events
may be temporarily offline and may return at some future time.

Other nodes in the network can pin (maintain and store) events from your streams or anyone else's streams. If you suffer a data loss, some other node MAY have preserved your data. Popular streams and their events are likely to be stored on many nodes in the network. # Streams

Data structures core to Ceramic

### Overview

Streams are a core concept in Ceramic, they include a primary data structure called an event log, a URI scheme to identify unique streams in a network, a simple consensus model to agree on the same event log across the network, and a supporting lifecycle of creating, updating, querying, and syncing streams. 

### [Event Log](event-log.md)

The core data structure of streams is a self-certifying event log. It combines IPLD for hash linked data and cryptographic proofs to create an authenticated and immutable log. This event log can be used to model mutable databases and other data structures on top.

### [URI Scheme](uri-scheme.md)

A URI scheme is used to reference unique streams and unique events included in streams. They use a self describing format that allows anyone to parse and consume a stream correctly, while also easily supporting future changes and new types. 

### [Consensus](consensus.md)

An event log or stream can end up with multiple branches or tips across nodes in the network. Different branches will result in differing stream state. A simple consensus model is used to allow all nodes whom consume the same set of events to eventually agree on a single log or state. 

### [Stream Lifecycle](lifecycle.md)

A stream write lifecycle includes its creation and updates, otherwise know as events. A stream read lifecycle includes queries and syncing. # URI Scheme

---

## Stream URL

---

Each stream in Ceramic is identified by a unique URL. This URL is comprised of a protocol identifier for Ceramic and a StreamId as defined below.

When encoded as a string the StreamID is prepended with the protocol handler and StreamID is typically encoded using `base36`. This fully describes which stream and where it is located, in this case it can be found on the Ceramic Network.


```bash
ceramic://<StreamId>
```

For example, a StreamId may look as follows:

```bash
ceramic://kjzl6fddub9hxf2q312a5qjt9ra3oyzb7lthsrtwhne0wu54iuvj852bw9wxfvs
```

EventIds can also be encoded in the same way. 

```bash
ceramic://<EventId>
```

## StreamId

---

A StreamId is composed of a StreamId code, a stream type, and a CID. It is used to reference a specific and unique event stream. StreamIds are similar to CIDs in IPLD, and use multiformats, but they provide additional information specific to Ceramic event streams. This also allows them to be distinguished from CIDs. The *init event* of an event stream is used to create the StreamId. 

StreamIds are defined as:

```bash
<streamid> ::= <multibase-prefix><multicodec-streamid><stream-type><init-cid-bytes>

# e.g. using CIDv1
<streamid> ::= <multibase-prefix><multicodec-streamid><stream-type><multicodec-cidv1><multicodec-content-type><multihash-content-address>
```

Where:

- **`<multibase-prefix>`** is a [multibase](https://github.com/multiformats/multibase) code (1 or 2 bytes), to ease encoding StreamIds into various bases. 
:::note
 Binary (not text-based) protocols and formats may omit the multibase prefix when the encoding is unambiguous.
:::
- **`<multicodec-streamid>`** `0xce` is a [multicodec](https://github.com/multiformats/multicodec) used to indicate that it's a [StreamId](https://github.com/multiformats/multicodec/blob/master/table.csv#L78), encoded as a varint
- **`<stream-type>`** is a [varint](https://github.com/multiformats/unsigned-varint) representing the stream type of the stream.
- **`<init-cid-bytes>`** is the bytes from the [CID](https://github.com/multiformats/cid) of the `init event`,  stripped of the multibase prefix.

The multicodec for StreamID is [`0xce`](https://github.com/multiformats/multicodec/blob/master/table.csv#L78). For compatibility with browser urls it's recommended to encode the StreamId using [[`base36`]](https://github.com/multiformats/multibase).

The stream type value does not currently have any functionality at the protocol level. Rather, it is used by applications building on top of Ceramic (e.g. ComposeDB) to distinguish between different logic that is applied when processing events. Stream Type values have to be registered in the table of [CIP-59](https://github.com/ceramicnetwork/CIP/blob/main/CIPs/CIP-59/CIP-59.md#registered-values). 

## EventId

---

EventIds extend StreamIds to reference a specific event in a specific stream. Additional bytes are added to the end of a StreamId. If it represents the genesis event the zero byte is added (`0x00`) otherwise the CID that represents the event is added.

EventIds are defined as

```bash
<streamid> ::= <multibase-prefix><multicodec-streamid><stream-type>
  <genesis-cid-bytes>
  <event-reference>

# e.g. using CIDv1 and representing the genesis event
<streamid> ::= <multibase-prefix><multicodec-streamid><stream-type>
  <multicodec-cidv1><multicodec-content-type><multihash-content-address>
  <0x00>

# e.g. using CIDv1 and representing an arbitrary event in the log
<streamid> ::= <multibase-prefix><multicodec-streamid><stream-type>
  <multicodec-cidv1><multicodec-content-type-1><multihash-content-address-1>
  <multicodec-cidv1><multicodec-content-type-2><multihash-content-address-2>

```

Where:

- **`<event-reference>`** is either the zero byte (`0x00`) or [CID](https://github.com/multiformats/cid) bytes.

### Stream Versions

Each EventId can also be considered a reference to a specific version of a stream. At any EventId, a stream can be loaded up until that event and the resulting set of events are considered the version of that stream.