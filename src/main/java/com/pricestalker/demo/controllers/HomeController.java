package com.pricestalker.demo.controllers;

import com.pricestalker.demo.repositories.ProductRepository;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Controller;





@Controller
public class HomeController {
    private ProductRepository productRepository;

    public HomeController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @GetMapping({"/","/home"})
    public String home(Model model) {
        model.addAttribute("product", productRepository.findTrending(PageRequest.of(0,9))
        );
        return "Home/home";
    }


    
}
