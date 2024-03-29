import { Box } from "@mui/material";
import { getParsedNftAccountsByOwner } from "@nfteyez/sol-rayz";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Promise from "bluebird";
import { chunk, filter, find, get, map } from "lodash";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { TFunction } from "react-i18next";
import { PagedList } from "../components/PagedList";
import ReadyCard from "../components/ReadyCard";
import { DEBUG } from "../config";
import { NFTType } from "../contexts/type";
import { adminValidation, getNftMetaData, solConnection } from "../contexts/utils";

export default function CreateRaffle(props: {
  startLoading: Function;
  closeLoading: Function;
  t: TFunction;
}) {
  const { startLoading, closeLoading, t } = props;
  const PAGE_SIZE = 24;
  const wallet = useWallet();
  const router = useRouter();
  const [masterList, setMasterList] = useState<any>([]);
  const [nftList, setNftList] = useState<any>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const getNFTDetails = async (nftsList: Array<NFTType>) => {
    const nftItemList = await Promise.mapSeries(nftsList, async item => {
      const { mint } = item;
      const existed = find(nftList, itm => !!itm && itm.mint === mint);
      if (!existed) {
        try {
          const uri = await getNftMetaData(new PublicKey(mint));
          const resp = await fetch(uri);
          const json = await resp.json();
          const { image, name } = json;
          return { mint, image, name };
        } catch (error) {
          console.error(error);
          return { mint, image: '', name: mint }
        }
      }
    })
    return filter(nftItemList, item => !!item)
  }

  const getNFTs = async () => {
    if (wallet.publicKey === null) {
      return;
    }
    try {
      startLoading(true);
      const nftsList = await getParsedNftAccountsByOwner({
        publicAddress: wallet.publicKey.toBase58(),
        connection: solConnection,
      });
      const chunked = chunk(nftsList, PAGE_SIZE);
      setMasterList(chunked);
      await getPage(1, chunked);
    } catch (error) {
      console.error(error);
    } finally {
      closeLoading(false);
    }
  };

  const getPage = async (page: number, array: Array<any> = masterList) => {
    try {
      startLoading();
      const pagedNftList = await getNFTDetails(get(array || masterList, page - 1));
      const newNftList = [...nftList, ...pagedNftList];
      setNftList(newNftList);
    } catch (error) {
      console.error(error);
    } finally {
      closeLoading();
    }
  }

  useEffect(() => {
    if (wallet.publicKey !== null) {
      const admin = DEBUG ? true : adminValidation(wallet);
      setIsAdmin(admin);
      if (admin) {
        getNFTs();
      } else {
        router.push("/raffle", '/')
      }
    } else {
      setIsAdmin(false);
      setNftList([]);
    }
    // eslint-disable-next-line
  }, [wallet.connected]);
  return (
    <Box sx={{
      minHeight: 'calc(100vh - 80px)',
      p: 4,
      backgroundColor: "background.default",
      color: "text.primary",
    }}>
      <PagedList component={ReadyCard} masterList={masterList} pageList={nftList} t={t} getPage={getPage} pageSize={PAGE_SIZE}></PagedList>
    </Box>
  );
}
